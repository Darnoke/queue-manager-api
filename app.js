require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const mongoose = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer();
app.use(upload.array());

app.use(express.json());
app.use(session({
  secret: process.env.SECRET_KEY || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  rolling: true, // auto-refresh
  cookie: {
    maxAge: 20 * 60 * 1000, // 20 minutes
  },  
}));

const apiRouter = express.Router();
app.use('/api', apiRouter);

apiRouter.use('/auth', authRoutes);

apiRouter.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
