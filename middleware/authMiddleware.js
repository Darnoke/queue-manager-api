const checkCredentials = (requiredRole) => (req, res, next) => {
    const user = req.session.user;
    if (user && user.role === requiredRole) next();
    else res.status(401).send('Unauthorized, required role: ' + requiredRole);
};

const checkCredentialsSocket = (requiredRole) => (socket, next) => {
  const user = socket.handshake.session?.user;

  if (user && user.role === requiredRole) {
    console.log(`User ${user.username} authenticated for the Socket.IO action`);
    socket.isWorker = true;
    next();
  } else {
    console.log('User not authenticated for the Socket.IO action');
    socket.isWorker = false;
    next();
  }
};

module.exports = { checkCredentials, checkCredentialsSocket };