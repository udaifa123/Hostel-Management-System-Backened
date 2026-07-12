import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeSocket } from './socket/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ✅ SOCKET
const io = initializeSocket(httpServer);
app.set('io', io);

// ✅ 🔥 FIXED CORS (IMPORTANT CHANGE)
app.use(cors({
  origin: true,   // allow all origins
  credentials: true
}));

// ✅ BODY PARSER
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ STATIC
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ ROUTES
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
import autoFeeRoutes from './routes/autoFeeRoutes.js';
import autoFeeCron from './cron/autoFeeCron.js';
import assetRoutes from './routes/assetRoutes.js';

// ✅ TEST ROUTES
app.get('/', (req, res) => {
  res.json({ message: 'API Working ✅' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ✅ API ROUTES
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
app.use('/api/auto-fee', autoFeeRoutes);

// ✅ CRON
autoFeeCron.init();

// ✅ 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message
  });
});

// ✅ DB CONNECT
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected ✅');

    const PORT = process.env.PORT || 4000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on ${PORT} 🚀`);
    });
  })
  .catch(err => {
    console.error('DB Error ❌', err);
  });

export default app;