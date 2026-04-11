const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 5000;

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });
});

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hospital-management';

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Could not connect to MongoDB', err));

app.use('/api/signup', require('./routes/signup'));
app.use('/api/login', require('./routes/login'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/fog', require('./routes/fogIngest'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/vitals', require('./routes/vitals'));

app.get('/', (req, res) => {
  res.send('Welcome to the Hospital Management System API (Cloud layer)');
});

server.listen(PORT, () => {
  console.log(`Cloud server is running on port ${PORT}`);
});
