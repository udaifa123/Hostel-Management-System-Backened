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


router.use(protect);
router.use(authorize('warden'));


router.post('/generate', generateQRCode);

router.post('/scan', scanQRCode);

router.post('/verify/:qrCode', verifyQRCode);


router.get('/history', getQRHistory);

router.get('/attendance', getAttendanceByQR);

export default router;