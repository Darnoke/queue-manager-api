const checkCredentialsSocket = require('../middleware/authMiddleware').checkCredentialsSocket;
const Client = require('../models/client');
const Queue = require('../models/queue');

const setupQueue = (io) => {
  // const ioNamespace = io.of('/api/socket/queue');
  console.log('io created');

  io.on('connection', async (socket) => {
    const { queueId } = socket.handshake.query;

    socket.join(queueId);
    console.log(queueId)

    socket.on('disconnect', () => {

    });

    // socket.on('authenticated_action', checkCredentialsSocket('worker'), async (data) => {
    //   // Your existing logic here
    //   // ...

    //   // Inform all connected clients about the new client
    //   informClientsAboutNewClient(queueId);
    // });

    // Return current clients list from the database
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

const emitNewClientAdded = (io, queueId, client) => {
  io.to(queueId).emit('new_client_added', client);
};

module.exports = {
  setupQueue,
  emitNewClientAdded
};