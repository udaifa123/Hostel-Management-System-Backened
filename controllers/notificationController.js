// controllers/notificationController.js
import Notification from '../models/Notification.js';

// Get user's notifications with pagination and filtering
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly } = req.query;
    
    let query = { recipient: req.user.id };
    
    if (type && type !== 'all') {
      query.type = type;
    }
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query)
    ]);
    
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get unread count only (for real-time updates)
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark notification as read with socket emit
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    ).populate('sender', 'name email');
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${notification.recipient}`).emit('notification_read', notification._id);
    }
    
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark all as read with socket emit
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.user.id}`).emit('all_notifications_read');
    }
    
    res.json({ 
      success: true, 
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete all read notifications
export const deleteAllRead = async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      recipient: req.user.id,
      isRead: true
    });
    
    res.json({ 
      success: true, 
      message: `${result.deletedCount} read notifications deleted`,
      count: result.deletedCount
    });
  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to create and send notification (for other controllers)
export const createNotification = async (recipientId, notificationData, io) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: notificationData.senderId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      priority: notificationData.priority || 'normal',
      data: {
        referenceId: notificationData.referenceId,
        referenceModel: notificationData.referenceModel,
        actionUrl: notificationData.actionUrl,
        metadata: notificationData.metadata
      }
    });
    
    await notification.save();
    await notification.populate('sender', 'name email avatar');
    
    // Emit real-time notification via socket
    if (io) {
      io.to(`user_${recipientId}`).emit('new_notification', notification);
      console.log(`📢 Real-time notification sent to user ${recipientId}: ${notification.title}`);
    }
    
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// Create notification for multiple recipients
export const createBulkNotifications = async (recipientIds, notificationData, io) => {
  try {
    const notifications = [];
    for (const recipientId of recipientIds) {
      const notification = new Notification({
        recipient: recipientId,
        sender: notificationData.senderId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority || 'normal',
        data: {
          referenceId: notificationData.referenceId,
          referenceModel: notificationData.referenceModel,
          actionUrl: notificationData.actionUrl,
          metadata: notificationData.metadata
        }
      });
      await notification.save();
      await notification.populate('sender', 'name email avatar');
      notifications.push(notification);
      
      // Emit to each recipient
      if (io) {
        io.to(`user_${recipientId}`).emit('new_notification', notification);
      }
    }
    
    console.log(`📢 Bulk notifications sent to ${recipientIds.length} users`);
    return notifications;
  } catch (error) {
    console.error('Bulk notification error:', error);
    return [];
  }
};