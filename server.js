import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSocket } from './socket/index.js';

dotenv.config();


console.log('📁 Environment:');
console.log('PORT:', process.env.PORT);
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Found' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Found' : '❌ Missing');


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
// import feeCron from './cron/feeCron.js'; 
import autoFeeRoutes from './routes/autoFeeRoutes.js';
import autoFeeCron from './cron/autoFeeCron.js';
import assetRoutes from './routes/assetRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);


const io = initializeSocket(httpServer);
app.set('io', io);


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


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.get('/', (req, res) => {
  res.json({ 
    message: '🏠 Hostel Management API',
    version: '2.0.0',
    status: 'active',
    cors: 'enabled'
  });
});


app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    mongodb: process.env.MONGO_URI ? 'configured' : 'missing'
  });
});


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
app.use('/api/assets', assetRoutes);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auto-fee', autoFeeRoutes);

// feeCron.init();

autoFeeCron.init();

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found` 
  });
});


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