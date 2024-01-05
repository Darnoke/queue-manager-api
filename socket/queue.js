const { checkCredentialsSocket } = require('../middleware/authMiddleware');
const Client = require('../models/client');
const Queue = require('../models/queue');

const setupQueue = (io) => {
  console.log('io created');

  io.use(checkCredentialsSocket('worker'));

  io.on('connection', async (socket) => {
    const { queueId, userId } = socket.handshake.query;
    // console.log('Authenticated user:', socket.handshake.session);
    const socketId = socket.id;

    socket.join(queueId);
    console.log(queueId)

    socket.on('disconnect', () => {

    });

    if(socket.isWorker) {
      socket.on('take_client', async (clientId) => {
        const queue = await Queue.findById(queueId).populate({
          path: 'clients',
          select: 'category assignedNumber createdAt status',
          populate: {
            path: 'category',
            select: 'name'
          }
        });

        if (!queue) {
          console.error('Queue not found');
          return;
        }

        const clientToUpdate = queue.clients.find(client => client._id.toString() === clientId);

        if (!clientToUpdate) {
          console.error('Client not found');
          return;
        }

        clientToUpdate.status = 'inProgress';
        await queue.save();
        
        const clientData = clientToUpdate.toObject();
        clientData._id = clientData._id.toString();
        clientData.category._id = clientData.category._id.toString();

        const currentClient = clientData;

        io.to(socketId).emit('worker_update', currentClient);
        const clients = await getClientList(queueId);
        io.to(queueId).emit('queue_update', clients);
      });

      socket.on('finish_client', async (clientId) => {
        const currentClient = null;
        io.to(socketId).emit('worker_update', currentClient);
        const clients = await getClientList(queueId);
        io.to(queueId).emit('queue_update', clients);
      });

      socket.on('cancel_client', async (clientId) => {
        const currentClient = null;
        io.to(socketId).emit('worker_update', currentClient);
        const clients = await getClientList(queueId);
        io.to(queueId).emit('queue_update', clients);
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

module.exports = {
  setupQueue,
  emitQueueUpdate
};