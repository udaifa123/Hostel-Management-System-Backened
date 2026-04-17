import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  deliveredAt: Date,
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});


messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;