const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = socketio(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    
    socket.join(`user:${socket.user._id}`);
    

    socket.join(`role:${socket.user.role}`);

   
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };