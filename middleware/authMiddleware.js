const checkCredentials = (requiredRole) => (req, res, next) => {
    const user = req.session.user;
    if (user && user.role === requiredRole) next();
    else res.status(401).send('Unauthorized, required role: ' + requiredRole);
};

module.exports = { checkCredentials };