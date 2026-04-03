import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getOnlineStatus,
  getWarden
} from '../controllers/chatController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/warden', getWarden);
router.get('/conversations', getConversations);
router.get('/messages/:userId', getMessages);
router.post('/send', sendMessage);
router.put('/read/:userId', markAsRead);
router.delete('/message/:messageId', deleteMessage);
router.get('/online-status', getOnlineStatus);

export default router;