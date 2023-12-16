const express = require('express');
const router = express.Router();

const queueRoutes = require('./queues');
const usersRoutes = require('./users');

router.use('/users', usersRoutes);
// router.use('/queues', queueRoutes);

module.exports = router;