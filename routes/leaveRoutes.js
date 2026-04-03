import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  applyLeave,
  getStudentLeaves,
  getLeaveDetails,
  getAllLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveStatistics
} from '../controllers/leaveController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Student routes
router.post('/', authorize('student'), applyLeave);
router.get('/my-leaves', authorize('student'), getStudentLeaves);
router.put('/:id/cancel', authorize('student'), cancelLeave);

// Common routes
router.get('/:id', getLeaveDetails);

// Admin/Warden routes
router.get('/', authorize('admin', 'warden'), getAllLeaves);
router.put('/:id/approve', authorize('admin', 'warden'), approveLeave);
router.put('/:id/reject', authorize('admin', 'warden'), rejectLeave);
router.get('/stats/overview', authorize('admin', 'warden'), getLeaveStatistics);

export default router;