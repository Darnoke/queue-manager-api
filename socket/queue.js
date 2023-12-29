
const checkCredentialsSocket = require('../middleware/authMiddleware').checkCredentialsSocket;

const setupQueue = (io) => {
  const ioNamespace = io.of('/api/socket/queue');

  ioNamespace.on('connection', (socket) => {
    const { queueId } = socket.handshake.query; // Extract queueId from query parameters

    socket.join(queueId); // Join the room for the queue

    socket.on('authenticated_action', checkCredentialsSocket('worker'), (data) => {
      handleAuthenticatedAction(socket, data, queueId);
    });
  });
};

module.exports = {
  setupQueue,
};