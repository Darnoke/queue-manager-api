const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('./../models/user');

router.post('/register', async (req, res) => {
    try {
      const { username, role } = req.body;
  
      const existingUser = await User.findOne({ username });
  
      if (existingUser) {
        return res.status(409).send('Username already in use');
      };

      const defaultPassword = process.env.DEFAULT_PASSWORD;
  
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
      const user = new User({
        username,
        password: hashedPassword,
        role: role,
      });
  
      await user.save();
      res.status(201).send('User registered successfully.');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/users/:username', async (req, res) => {
  try {
    const userUsername = req.params.username;
    
    const user = await User.findById(userUsername);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/users/:username', async (req, res) => {
  try {
    const userUsername = req.params.username;
    const { username, role } = req.body;

    if (!userUsername) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { username: userUsername },
      { username, role },
      { new: true } // Returns the updated user
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;