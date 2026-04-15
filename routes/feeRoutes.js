import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  // Admin
  getAllFeesAdmin,
  generateFee,
  generateAllFees,
  updateFee,
  deleteFee,
  getFeeAnalytics,
  // Warden
  getAllFeesWarden,
  manualPayment,
  addManualFine,
  sendFeeReminder,
  // Student
  getMyFees,
  processPayment,
  // Parent
  getChildrenFees,
  payChildFee,
   directGenerateFees ,
    // ✅ ADD THESE NEW IMPORTS
  recalculateAttendanceFee,
  recalculateAllAttendanceFees,
  getAttendanceFeeReport
} from '../controllers/feeController.js';

const router = express.Router();

// ==================== ADMIN ROUTES ====================
router.get('/admin/all-fees', protect, authorize('admin'), getAllFeesAdmin);
router.post('/admin/generate-fee', protect, authorize('admin'), generateFee);
router.post('/admin/generate-all-fees', protect, authorize('admin'), generateAllFees);
router.put('/admin/fees/:feeId', protect, authorize('admin'), updateFee);
router.delete('/admin/fees/:feeId', protect, authorize('admin'), deleteFee);
router.get('/admin/analytics', protect, authorize('admin'), getFeeAnalytics);

// ==================== WARDEN ROUTES ====================
router.get('/warden/hostel-fees', protect, authorize('warden'), getAllFeesWarden);
router.post('/warden/manual-payment', protect, authorize('warden'), manualPayment);
router.post('/warden/add-fine', protect, authorize('warden'), addManualFine);
router.post('/warden/send-reminder/:feeId', protect, authorize('warden'), sendFeeReminder);

// ==================== STUDENT ROUTES ====================
router.get('/student/my-fees', protect, authorize('student'), getMyFees);
router.post('/student/pay', protect, authorize('student'), processPayment);

// ==================== PARENT ROUTES ====================
router.get('/parent/children-fees', protect, authorize('parent'), getChildrenFees);
router.post('/parent/pay-child-fee', protect, authorize('parent'), payChildFee);


// Add this line
router.post('/admin/direct-generate', protect, authorize('admin'), directGenerateFees);
export default router;



// Add these routes after your existing admin routes

// Attendance-based fee recalculation
router.post('/admin/recalculate-attendance-fee/:feeId', protect, authorize('admin'), recalculateAttendanceFee);
router.post('/admin/recalculate-all-attendance-fees', protect, authorize('admin'), recalculateAllAttendanceFees);
router.get('/admin/attendance-fee-report', protect, authorize('admin'), getAttendanceFeeReport);