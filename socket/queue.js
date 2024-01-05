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
      } catch (error) {
        console.log(error);
      }
    }

    socket.join(queueId);
    console.log(queueId)

    socket.on('disconnect', () => {});

    if (socket.isWorker) {
      socket.on('take_client', async (clientId) => {
        try {
          const currentClient = await handleWorkerAction(queueId, clientId, workerId, 'inProgress');
          io.to(socketId).emit('worker_update', currentClient);
          const clients = await getClientList(queueId);
          io.to(queueId).emit('queue_update', clients);
        } catch (error) {
          console.error('Error handling take_client:', error);
        }
      });

      socket.on('finish_client', async (clientId) => {
        try {
          const currentClient = await handleWorkerAction(queueId, clientId, workerId, 'done');
          io.to(socketId).emit('worker_update', currentClient);
          const clients = await getClientList(queueId);
          io.to(queueId).emit('queue_update', clients);
        } catch (error) {
          console.error('Error handling take_client:', error);
        }
      });

      socket.on('cancel_client', async (clientId) => {
        try {
          const currentClient = await handleWorkerAction(queueId, clientId, workerId, 'waiting');
          io.to(socketId).emit('worker_update', currentClient);
          const clients = await getClientList(queueId);
          io.to(queueId).emit('queue_update', clients);
        } catch (error) {
          console.error('Error handling take_client:', error);
        }
      });
    }

    try {
      const clients = await getClientList(queueId);
      socket.emit('on_connect', clients);
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
  const clients = await getClientList(queueId);
  io.to(queueId).emit('queue_update', clients);
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

  const worker = await Worker.findById(workerId, 'currentStatus clientActionsHistory');
  if (!worker) {
    throw Error('Worker not found');
  }
  worker.clientActionsHistory.push({ client: clientToUpdate._id.toString(), action: statusToAction[status] });

  let clientData = null;

  if (status === 'inProgress') {
    worker.currentStatus = 'occupied';
    clientData = clientToUpdate.toObject();
    clientData._id = clientData._id.toString();
    clientData.category._id = clientData.category._id.toString();
  } else {
    worker.currentStatus = 'free';
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

module.exports = {
  setupQueue,
  emitQueueUpdate
};