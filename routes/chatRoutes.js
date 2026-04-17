import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getOnlineStatus,
  getWarden,
  getWardensForParent,
  getParentChatMessages,
  sendParentMessage,
  getWardenConversations,
  getWardenChatMessages,
  sendWardenMessage
} from '../controllers/chatController.js';

const router = express.Router();

router.use(protect);


router.get('/warden', getWarden);
router.get('/conversations', getConversations);
router.get('/messages/:userId', getMessages);
router.post('/send', sendMessage);
router.put('/read/:userId', markAsRead);
router.delete('/message/:messageId', deleteMessage);
router.get('/online-status', getOnlineStatus);


router.get('/parent/wardens', getWardensForParent);
router.get('/parent/chat/:wardenId', getParentChatMessages);
router.post('/parent/send', sendParentMessage);


router.get('/warden/conversations', getWardenConversations);
router.get('/warden/chat/:parentId', getWardenChatMessages);
router.post('/warden/send', sendWardenMessage);

export default router;