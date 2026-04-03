import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'maintenance', 'event', 'mess', 'emergency'],
    default: 'general'
  },
  pinned: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel'
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  expiresAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
noticeSchema.index({ createdAt: -1 });
noticeSchema.index({ pinned: -1, createdAt: -1 });
noticeSchema.index({ category: 1 });
noticeSchema.index({ hostel: 1 });

export default mongoose.model('Notice', noticeSchema);