const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Worker = require('../models/worker');
const Queue = require('../models/queue');

router.get('/queues/:userId', async (req, res) => { 
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if(!user) {
      return res.status(404).send('User not found');
    }

    const workers = await Worker.find({ user: userId });
    const queueIds = workers.map(worker => worker.queue);

    const queueList = await Queue.find({ _id: { $in: queueIds } }, '_id name');
    return res.json(queueList);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;