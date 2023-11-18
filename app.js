require('dotenv').config();

const express = require('express');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SECRET_KEY || 'defaultsecret',
  resave: false,
  saveUninitialized: false,
  rolling: true, // auto-refresh
  cookie: {
    maxAge: 20 * 60 * 1000, // 20 minutes
  },  
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});