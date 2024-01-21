const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');
const Worker = require('../models/worker');
const Queue = require('../models/queue');

function generateSecurePassword(length = 10) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

router.post('/register', async (req, res) => {
  try {
    const { username, role } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).send('Username already in use');
    };

    const generatedPassword = generateSecurePassword();

    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const user = new User({
      username,
      password: hashedPassword,
      role: role,
    });

    await user.save();
    res.status(201).json({generatedPassword});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/', async (req, res) => {
try {
  const users = await User.find({}, '_id username role');
  res.json(users);
} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}
});

router.get('/:userId', async (req, res) => {
try {
  const userId = req.params.userId;
  
  const user = await User.findById(userId, '_id username role');
  res.json(user);
} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}
});

router.delete('/:userId', async (req, res) => {
try {
  const userId = req.params.userId;
  
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const workersToDelete = await Worker.find({ 'user': user._id });
  const deletedWorkerIds = workersToDelete.map(worker => worker._id);

  Worker.updateMany(
    { 'user': user._id },
    { $pull: { 'user': user._id }}
  );

  await Queue.updateMany(
    { 'workers': { $in: deletedWorkerIds } },
    { $pull: { 'workers': { $in: deletedWorkerIds }}}
  );

  await User.findByIdAndDelete(userId);

  res.json({ message: 'User deleted successfully' });
} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}
});

router.put('/:userId', async (req, res) => {
try {
  const userId = req.params.userId;
  const { username, role } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(400).send('Invalid user ID');
  }

  if (username !== user.username) {  // changing username to already existing one
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).send('Username already exists');
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { username, role },
    { new: true } // Returns the updated user
  );

  if (!updatedUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(updatedUser);
} catch (error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}
});

module.exports = router;