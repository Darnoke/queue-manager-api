const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('./../models/user');

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).send('Username already in use');
    };

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      password: hashedPassword,
      role: 'admin',
    });

    await user.save();
    res.status(201).send('User registered successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      const user = await User.findOne({ username });

      if (!user) {
        return res.status(401).send('Invalid username or password');
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return res.status(401).send('Invalid username or password');
      }
  
      req.session.user = {
        username: user.username,
        role: user.role,
      };
  
      res.status(200).json({
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });

module.exports = router;