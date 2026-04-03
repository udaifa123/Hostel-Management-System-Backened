import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  // Admin dashboard routes
  getAttendanceStats,
  getWeeklyAttendance,
  getMonthlyAttendance,
  // Warden routes
  getAttendanceByDate,
  markAttendance,
  getStudentAttendance,
  markAttendanceByQR
} from '../controllers/attendanceController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== ADMIN DASHBOARD ROUTES ====================
// These routes require admin role
router.get('/stats', authorize('admin'), getAttendanceStats);
router.get('/weekly', authorize('admin'), getWeeklyAttendance);
router.get('/monthly', authorize('admin'), getMonthlyAttendance);

// ==================== WARDEN ROUTES ====================
// These routes require warden role
router.get('/:date', authorize('warden'), getAttendanceByDate);
router.post('/mark', authorize('warden'), markAttendance);
router.get('/student/:studentId', authorize('warden'), getStudentAttendance);
router.post('/qr', authorize('warden'), markAttendanceByQR);

export default router;