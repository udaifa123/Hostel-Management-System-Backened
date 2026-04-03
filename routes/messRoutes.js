import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getMenu,
  updateMenu,
  copyMenu,
  clearDay,
  getMenuHistory,
  updateTimings,
  getWeeklyMenu,
  getParentTimings
} from '../controllers/messController.js';

const router = express.Router();

// ✅ All routes need login
router.use(protect);

// =========================
// 🔵 PARENT ROUTES
// =========================
router.get('/parent/menu', authorize('parent'), getWeeklyMenu);
router.get('/parent/timings', authorize('parent'), getParentTimings);

// =========================
// 🟢 WARDEN ROUTES
// =========================
router.get('/menu', authorize('warden'), getMenu);
router.post('/update', authorize('warden'), updateMenu);
router.post('/copy', authorize('warden'), copyMenu);
router.post('/clear', authorize('warden'), clearDay);
router.get('/history', authorize('warden'), getMenuHistory);
router.put('/timings', authorize('warden'), updateTimings);

export default router;