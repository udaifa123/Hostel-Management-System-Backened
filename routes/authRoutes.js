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


router.post('/register', register);
router.post('/login', login);


router.post('/admin/login', adminLogin);
router.post('/student/login', studentLogin);
router.post('/warden/login', wardenLogin);
router.post('/parent/login', parentLogin);


router.get('/me', protect, getMe);

export default router;