require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const mongoose = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const workerRoutes = require('./routes/worker');

const { checkCredentials } = require('./middleware/authMiddleware.js');

// socket io
const http = require('http');
const socketIO = require('socket.io');
const queueSocket = require('./socket/queue.js');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'http://localhost:4000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const upload = multer();
app.use(express.json());
app.use(cookieParser());
app.use(upload.array());

const corsOptions = {
  origin: ['http://localhost:4000'],
  credentials: true,
};

app.use(cors(corsOptions));

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  mongooseConnection: mongoose.connection,
  ttl: 14 * 24 * 60 * 60, // 14 days
});

app.use(session({
  secret: process.env.SECRET_KEY || 'defaultsecret',
  resave: true,
  saveUninitialized: true,
  rolling: true, // auto-refresh
  cookie: {
    maxAge: 20 * 60 * 1000, // 20 minutes
    secure: false,
    sameSite: 'lax',
  },  
  store: sessionStore,
}));

queueSocket.setupQueue(io);

const apiRouter = express.Router();
app.use('/api', (req, res, next)=>{res.header('Access-Control-Allow-Credentials', true); next()} ,apiRouter);

app.use(function(req, res, next){
  res.io = io;
  next();
});

apiRouter.use('/auth', authRoutes);

apiRouter.use('/client', clientRoutes);

apiRouter.use('/admin', checkCredentials('admin'), adminRoutes);

apiRouter.use('/worker', checkCredentials('worker'), workerRoutes);

apiRouter.get('/', (req, res) => {
  res.send('Hello World!');
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
