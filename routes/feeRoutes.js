import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getMyFees, processPayment, getReceipt,
  getChildrenFees, payChildFee,
  getAllFeesWarden, manualPayment,
  getAllFeesAdmin, generateAllFees, deleteFee
} from '../controllers/feeController.js';

const router = express.Router();

// Student routes
router.get('/my-fees', protect, authorize('student'), getMyFees);
router.post('/pay-fee', protect, authorize('student'), processPayment);
router.get('/receipt/:feeId', protect, authorize('student', 'parent'), getReceipt);

// Parent routes
router.get('/children-fees', protect, authorize('parent'), getChildrenFees);
router.post('/pay-child-fee', protect, authorize('parent'), payChildFee);

// Warden routes
router.get('/warden/fees', protect, authorize('warden'), getAllFeesWarden);
router.post('/warden/manual-payment', protect, authorize('warden'), manualPayment);

// Admin routes
router.get('/admin/fees', protect, authorize('admin'), getAllFeesAdmin);
router.post('/admin/generate-all-fees', protect, authorize('admin'), generateAllFees);
router.delete('/admin/fees/:feeId', protect, authorize('admin'), deleteFee);

export default router;