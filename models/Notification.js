import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['chat', 'visit', 'leave', 'complaint', 'fee', 'alert'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    referenceId: mongoose.Schema.Types.ObjectId,
    referenceModel: String,
    actionUrl: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;