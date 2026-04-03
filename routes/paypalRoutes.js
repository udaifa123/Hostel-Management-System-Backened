import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createOrder, captureOrder } from '../controllers/paypalController.js';

const router = express.Router();

router.post('/create-order', protect, createOrder);
router.post('/capture-order', protect, captureOrder);

export default router;