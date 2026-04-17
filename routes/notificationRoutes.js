import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} from '../controllers/notificationController.js';

const router = express.Router();


router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.put('/read/all', markAllAsRead);
router.delete('/:id', deleteNotification);
router.get('/unread/count', getUnreadCount);

export default router;