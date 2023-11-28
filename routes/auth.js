const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('./../models/user');

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

      await req.session.save();
  
      res.status(200).json({
        username: user.username,
        role: user.role,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
});

router.get('/logout', async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.clearCookie('connect.sid.');
        res.json({ message: 'Logout successful' });
      }
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/user', async (req, res) => {
  if (!req.session.user) res.status(401).send('User not logged in');
  return res.status(200).json(req.session.user);
});

module.exports = router;