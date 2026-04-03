// require("dotenv").config();
// const express = require('express');
// const cors = require('cors');
// const http = require('http');
// const socketio = require('socket.io');
// const connectDB = require('./config/db');

// const app = express();
// const server = http.createServer(app);

// // Connect to MongoDB
// connectDB();

// // Socket.io setup
// const io = socketio(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
//   }
// });

// // Make io accessible in routes
// app.set('io', io);

// // Track online users
// const onlineUsers = new Map();

// io.on('connection', (socket) => {
//   console.log('🔌 New client connected:', socket.id);

//   // Handle user joining with their ID
//   socket.on('user-connect', (userId) => {
//     socket.join(userId);
//     onlineUsers.set(userId, socket.id);
//     io.emit('online-users', Array.from(onlineUsers.keys()));
//     console.log(`👤 User ${userId} connected`);
//   });

//   // Handle private messages
//   socket.on('send-message', (data) => {
//     const { receiverId, message } = data;
    
//     // Emit to receiver if online
//     const receiverSocket = onlineUsers.get(receiverId);
//     if (receiverSocket) {
//       io.to(receiverId).emit('new-message', {
//         ...message,
//         delivered: true,
//         timestamp: new Date()
//       });
//     }
//   });

//   // Handle typing indicators
//   socket.on('typing', ({ receiverId, isTyping }) => {
//     const receiverSocket = onlineUsers.get(receiverId);
//     if (receiverSocket) {
//       io.to(receiverId).emit('user-typing', {
//         userId: socket.userId,
//         isTyping
//       });
//     }
//   });

//   // Handle visitor alerts
//   socket.on('visitor-arrived', (data) => {
//     const { studentId, visitor } = data;
    
//     // Notify student
//     const studentSocket = onlineUsers.get(studentId);
//     if (studentSocket) {
//       io.to(studentId).emit('visitor-notification', {
//         visitor,
//         message: `👋 Your visitor ${visitor.name} has arrived at the gate`,
//         timestamp: new Date()
//       });
//     }

//     // Notify warden
//     io.emit('warden-visitor-alert', {
//       studentId,
//       visitor,
//       message: `🚪 Visitor ${visitor.name} arrived for student`,
//       timestamp: new Date()
//     });
//   });

//   // Handle emergency alerts
//   socket.on('emergency', (data) => {
//     const { studentId, emergency } = data;
    
//     // Broadcast to all admins and wardens
//     io.emit('emergency-alert', {
//       studentId,
//       emergency,
//       message: `🚨 EMERGENCY ALERT from ${studentId}`,
//       timestamp: new Date()
//     });
//   });

//   // Handle attendance alerts
//   socket.on('attendance-marked', (data) => {
//     const { studentId, status, date } = data;
    
//     const studentSocket = onlineUsers.get(studentId);
//     if (studentSocket) {
//       io.to(studentId).emit('attendance-update', {
//         status,
//         date,
//         message: `📋 Your attendance has been marked as ${status}`
//       });
//     }

//     // Notify parent
//     io.emit('parent-attendance-alert', {
//       studentId,
//       status,
//       date,
//       message: `📊 Your ward's attendance has been marked as ${status}`
//     });
//   });

//   // Handle leave updates
//   socket.on('leave-updated', (data) => {
//     const { studentId, leaveId, status } = data;
    
//     const studentSocket = onlineUsers.get(studentId);
//     if (studentSocket) {
//       io.to(studentId).emit('leave-status', {
//         leaveId,
//         status,
//         message: `📝 Your leave request has been ${status}`
//       });
//     }
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     // Remove from online users
//     for (let [userId, socketId] of onlineUsers.entries()) {
//       if (socketId === socket.id) {
//         onlineUsers.delete(userId);
//         break;
//       }
//     }
//     io.emit('online-users', Array.from(onlineUsers.keys()));
//     console.log('🔌 Client disconnected:', socket.id);
//   });
// });

// // CORS configuration
// app.use(cors({ 
//   origin: "http://localhost:5173", 
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// // Middleware
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Test route
// app.get('/test', (req, res) => {
//   res.json({ message: '✅ Server is running!' });
// });

// // Routes
// const authRoutes = require('./routes/authRoutes');
// const attendanceRoutes = require('./routes/attendanceRoutes');
// const leaveRoutes = require('./routes/leaveRoutes');
// const messageRoutes = require('./routes/messageRoutes');
// const studentRoutes = require('./routes/studentRoutes');
// const adminRoutes = require('./routes/adminRoutes');
// const visitorRoutes = require('./routes/visitorRoutes');
// const notificationRoutes = require('./routes/notificationRoutes');

// app.use('/api/auth', authRoutes);
// app.use('/api/attendance', attendanceRoutes);
// app.use('/api/leaves', leaveRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/students', studentRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/visitors', visitorRoutes);
// app.use('/api/notifications', notificationRoutes);

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
// });

// // Error handler
// app.use((err, req, res, next) => {
//   console.error('❌ Server error:', err);
//   res.status(500).json({ error: 'Internal server error', details: err.message });
// });

// // Start server
// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => {
//   console.log(`\n🚀 Server running on port ${PORT}`);
//   console.log(`📝 Register: http://localhost:${PORT}/api/auth/register`);
//   console.log(`🔑 Login: http://localhost:${PORT}/api/auth/login`);
//   console.log(`✅ Test: http://localhost:${PORT}/test`);
//   console.log(`🔌 Socket.io server ready\n`);
// });








import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSocket } from './socket/index.js';

dotenv.config();

// Debug environment variables
console.log('📁 Environment:');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import wardenRoutes from './routes/wardenRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import messRoutes from './routes/messRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import paypalRoutes from './routes/paypalRoutes.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer);
app.set('io', io);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: '🏠 Hostel Management API',
    version: '2.0.0',
    status: 'active',
    cors: 'enabled'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongodb: process.env.MONGO_URI ? 'configured' : 'missing'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/warden', wardenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/paypal', paypalRoutes); 

// In your server.js, add this line
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found` 
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      url: req.url,
      method: req.method 
    })
  });
});

// Database connection
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file');
  process.exit(1);
}

console.log('📡 Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    
    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;