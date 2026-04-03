import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  generateQRCode,
  scanQRCode,
  getQRHistory,
  getAttendanceByQR,
  verifyQRCode
} from '../controllers/qrController.js';

const router = express.Router();

// All routes require authentication and warden role
router.use(protect);
router.use(authorize('warden'));

// Generate QR code for attendance
router.post('/generate', generateQRCode);

// Scan QR code and mark attendance
router.post('/scan', scanQRCode);

// Verify QR code validity
router.post('/verify/:qrCode', verifyQRCode);

// Get QR scan history
router.get('/history', getQRHistory);

// Get attendance marked via QR
router.get('/attendance', getAttendanceByQR);

export default router;