const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? [process.env.CLIENT_ORIGIN, 'http://localhost:3000']
  : '*';

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Clean socket disconnect
  });
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Root & Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'Hospital Management System Cloud API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Mount API routes
app.use('/api/signup', require('./routes/signup'));
app.use('/api/login', require('./routes/login'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/wards', require('./routes/wards'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/fog', require('./routes/fogIngest'));

// 404 Route Catch-All
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

// Start server after MongoDB connects
async function startServer() {
  if (!MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is missing. Check backend/.env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    server.listen(PORT, () => {
      console.log(`Hospital Cloud API server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server };
