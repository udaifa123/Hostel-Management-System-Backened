import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {

  getAttendanceStats,
  getWeeklyAttendance,
  getMonthlyAttendance,
  
  getAttendanceByDate,
  markAttendance,
  getStudentAttendance,
  markAttendanceByQR
} from '../controllers/attendanceController.js';

const router = express.Router();


router.use(protect);

// ==================== ADMIN DASHBOARD ROUTES ====================

router.get('/stats', authorize('admin'), getAttendanceStats);
router.get('/weekly', authorize('admin'), getWeeklyAttendance);
router.get('/monthly', authorize('admin'), getMonthlyAttendance);

// ==================== WARDEN ROUTES ====================

router.get('/:date', authorize('warden'), getAttendanceByDate);
router.post('/mark', authorize('warden'), markAttendance);
router.get('/student/:studentId', authorize('warden'), getStudentAttendance);
router.post('/qr', authorize('warden'), markAttendanceByQR);

export default router;