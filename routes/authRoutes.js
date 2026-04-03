import express from 'express';
import { 
  register, 
  login, 
  getMe, 
  adminLogin,
  studentLogin,
  wardenLogin,
  parentLogin 
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Role-specific login routes
router.post('/admin/login', adminLogin);
router.post('/student/login', studentLogin);
router.post('/warden/login', wardenLogin);
router.post('/parent/login', parentLogin);

// Protected route
router.get('/me', protect, getMe);

export default router;