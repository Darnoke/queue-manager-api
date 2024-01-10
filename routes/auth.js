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
        _id: user._id,
      };

      await req.session.save();

      const changePassword = password === process.env.DEFAULT_PASSWORD;
  
      res.status(200).json({
        changePassword,
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
        res.status(500).send('Internal Server Error');
      } else {
        res.clearCookie('connect.sid.');
        res.json({ message: 'Logout successful' });
      }
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/user', async (req, res) => {
  if (!req.session.user) return res.status(206).send('User not logged in');
  return res.status(200).json(req.session.user);
});

router.post('/change-password', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).send('User not logged in');

    const { oldPassword, newPassword } = req.body;
    if (oldPassword === newPassword) return res.status(401).send('Old and new passwords cannot be the same');

    const username = req.session.user.username;
    const user = await User.findOne({ username });
    
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
  
    if (!passwordMatch) return res.status(401).send('Old password is wrong');

    const password = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { username },
      { password }
    );

    return res.status(200).send('Password has been changed');
  } catch (error) {
    console.error('Error during changing password:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;