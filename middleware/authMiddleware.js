const checkCredentials = (requiredRole) => (req, res, next) => {
    const user = req.session.user;
    if (user && user.role === requiredRole) next();
    else res.status(401).send('Unauthorized, required role: ' + requiredRole);
};

const checkCredentialsSocket = (requiredRole) => (socket, next) => {
  const user = socket.request.session.user;

  if (user && user.role === requiredRole) {
      console.log(`User ${user.username} authenticated for the Socket.IO action`);
      next();
  } else {
      console.log('User not authenticated for the Socket.IO action');
      next(new Error('Authentication failed'));
  }
};

module.exports = { checkCredentials, checkCredentialsSocket };