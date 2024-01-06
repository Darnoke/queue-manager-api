const { checkCredentialsSocket } = require('../middleware/authMiddleware');
const Client = require('../models/client');
const Worker = require('../models/worker');
const Queue = require('../models/queue');

const setupQueue = (io) => {
  console.log('io created');

  io.use(checkCredentialsSocket('worker'));

  io.on('connection', async (socket) => {
    const { queueId, userId } = socket.handshake.query;
    const socketId = socket.id;
    let workerId = '';

    if (socket.isWorker) {
      try {
        workerId = await getWorkerId(queueId, userId);
        socket.workerId = workerId;
        await handleWorkerConnect(queueId, workerId);
      } catch (error) {
        console.log(error);
      }
    }
    getCategoriesCoverage(queueId)

    socket.join(queueId);

    socket.on('disconnect', async () => {
      if (socket.isWorker) {
        try {
          await handleWorkerDisconnect(queueId, workerId);
          await emitQueueUpdate(io, queueId);
        } catch (error) {
          console.log(error);
        }
      }
    });

    if (socket.isWorker) {
      socket.on('take_client', async (clientId) => {
        try {
          const currentClient = await handleWorkerAction(queueId, clientId, workerId, 'inProgress');
          io.to(socketId).emit('worker_update', currentClient);
          await emitQueueUpdate(io, queueId);
        } catch (error) {
          console.error('Error handling take_client:', error);
        }
      });

      socket.on('finish_client', async (clientId) => {
        try {
          const currentClient = await handleWorkerAction(queueId, clientId, workerId, 'done');
          io.to(socketId).emit('worker_update', currentClient);
          await emitQueueUpdate(io, queueId);
        } catch (error) {
          console.error('Error handling take_client:', error);
        }
      });

      socket.on('cancel_client', async (clientId) => {
        try {
          const currentClient = await handleWorkerAction(queueId, clientId, workerId, 'waiting');
          io.to(socketId).emit('worker_update', currentClient);
          await emitQueueUpdate(io, queueId);
        } catch (error) {
          console.error('Error handling take_client:', error);
        }
      });
    }

    try {
      if (socket.isWorker) {
        await emitQueueUpdate(io, queueId);
      } else { 
        const clients = await getClientList(queueId);
        socket.emit('on_connect', clients);
      }
    } catch (error) {
      console.error('Error retrieving clients from the database:', error);
    }
  });
};

const getClientList = async (queueId) => {
  try {
    const queue = await Queue.findById(queueId).populate({
      path: 'clients',
      select: 'category assignedNumber createdAt status',
      match: { status: 'waiting' },
      populate: {
        path: 'category',
        select: 'name'
      }
    });
    const clientList = queue.clients.map(clientModel => {
      const clientData = clientModel.toObject();
      clientData._id = clientData._id.toString();
      clientData.category._id = clientData.category._id.toString();
      return clientData;
    });
    return clientList;
  } catch (error) {
    console.error('Error retrieving clients from the database:', error);
    return [];
  }
}

const emitQueueUpdate = async (io, queueId) => {
  try {
    const clientsPreprocessed = await getClientList(queueId);

    const queueRoom = io.sockets.adapter.rooms.get(queueId);
    if (!queueRoom) {
      return;
    }
    const availableCategories = await getCategoriesCoverage(queueId);
    const workers = await Worker.find({ currentStatus: { $ne: 'not_available' }, queue: queueId }, '_id categories');
    for (const clientId of queueRoom) {
      const socket = io.sockets.sockets.get(clientId);
      if (socket.isWorker) {
        const worker = workers.find(worker => worker._id.equals(socket.workerId));
        if (!worker) continue;
        const workerCategories = worker.categories.map(category => category.toString());
        const clients = calculateScoreList(workerCategories, availableCategories, clientsPreprocessed);
        socket.emit('queue_update', clients);
      } else {
        const clients = clientsPreprocessed;
        socket.emit('queue_update', clients);
      }
    }
  } catch (error) {
    console.error('Error emitting queue update:', error);
  }
};

const handleWorkerAction = async ( queueId, clientId, workerId, status ) => {
  const queue = await Queue.findById(queueId).populate({
    path: 'clients',
    select: 'category assignedNumber createdAt status _id',
    populate: {
      path: 'category',
      select: 'name'
    }
  });

  if (!queue) {
    throw Error('Queue not found');
  }

  const clientToUpdate = queue.clients.find(client => client._id.toString() === clientId);

  if (!clientToUpdate) {
    throw Error('Client not found');
  }

  clientToUpdate.status = status;
  await clientToUpdate.save();

  const statusToAction = { 'waiting': 'cancel', 'inProgress': 'take', 'done': 'finish' };

  const worker = await Worker.findById(workerId, 'currentClient currentStatus clientActionsHistory');
  if (!worker) {
    throw Error('Worker not found');
  }
  worker.clientActionsHistory.push({ client: clientToUpdate._id.toString(), action: statusToAction[status] });

  let clientData = null;

  if (status === 'inProgress') {
    worker.currentClient = clientId;
    worker.currentStatus = 'occupied';
    clientData = clientToUpdate.toObject();
    clientData._id = clientData._id.toString();
    clientData.category._id = clientData.category._id.toString();
  } else {
    worker.currentStatus = 'free';
    worker.currentClient = null;
  }

  await worker.save();

  return clientData;
}

const getWorkerId = async (queueId, userId) => {
  const queue = await Queue.findById(queueId).populate({
    path: 'workers',
    select: 'user',
  });

  if (!queue) {
    return Error('Queue not found');
  }
  const worker = queue.workers.find(worker => worker.user.equals(userId));

  if (!worker) {
    return Error('Worker not found');
  }

  return worker._id.toString();
}

const handleWorkerDisconnect = async (queueId, workerId) => {
  const worker = await Worker.findById(workerId, 'currentClient currentStatus');
  if (worker.currentClient) {
    const currentClient = worker.currentClient.toString();
    await handleWorkerAction(queueId, currentClient, workerId, 'done');
  }
  worker.currentStatus = 'not_available';
  await worker.save();
}

const handleWorkerConnect = async (queueId, workerId) => {
  const worker = await Worker.findById(workerId, 'currentStatus');
  worker.currentStatus = 'free';
  await worker.save();
}

const getCategoriesCoverage = async (queueId) => {
  const queue = await Queue.findById(queueId).populate({
    path: 'workers',
    select: 'categories currentStatus'
  });

  if (!queue) {
    throw Error('Queue not found');
  }

  const categories = [];
  queue.workers.forEach(worker => { if (worker.currentStatus !== 'not_available') {
    worker.categories.forEach(category => {
      if (!(category in categories)) categories.push(category.toString());
    })
  }});

  return categories;
}

const calculateScoreList = (workerCategories, availableCategories, clientList) => {
  const scoreHeadstart = { 'good': 300, 'medium': 150, 'bad': 0 };
  const scoreMultiplier = { 'good': 1, 'medium': 0.9, 'bad': 0.7 };
  const clientListCopy = clientList.map(client => {
    const clientCopy = { ...client };
    clientCopy.categoryStatus = workerCategories.includes(clientCopy.category._id) ? 'good' : availableCategories.includes(clientCopy.category._id) ? 'bad' : 'medium';
    clientCopy.score = scoreHeadstart[clientCopy.categoryStatus]; // 300 points if worker has category, 0 if category is available, 150 if not
    const time = new Date(clientCopy.createdAt);
    clientCopy.score += (Date.now() - time.getTime()) / 1000 * scoreMultiplier[clientCopy.categoryStatus];  // 1 point per second
    return clientCopy;
  });
  return clientListCopy.sort((a, b) => b.score - a.score);
}

module.exports = {
  setupQueue,
  emitQueueUpdate
};