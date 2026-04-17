import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintNumber: {
    type: String,
    unique: true,
    default: function() {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `CMP${year}${month}${day}${random}`;
    }
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['electrical', 'plumbing', 'carpentry', 'cleaning', 'food', 'room', 'security', 'harassment', 'medical', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved'],
    default: 'pending'
  },
  location: {
    room: String,
    building: String,
    floor: Number
  },
  response: String,
  timeline: [{
    status: String,
    remark: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


complaintSchema.pre('save', async function () {
  if (!this.complaintNumber) {
    const count = await mongoose.model('Complaint').countDocuments();

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    this.complaintNumber = `CMP${year}${month}${day}${(count + 1)
      .toString()
      .padStart(4, '0')}`;
  }
});

export default mongoose.model('Complaint', complaintSchema);