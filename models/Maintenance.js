import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['electrical', 'plumbing', 'carpentry', 'cleaning', 'pest', 'furniture', 'ac', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contactNumber: {
    type: String
  },
  images: [{
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: [{
    note: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  assignedAt: Date,
  startedAt: Date,
  completedAt: Date,
  resolution: String,
  cost: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});


maintenanceSchema.pre('save', function() {
  if (!this.requestNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.requestNumber = `MNT${year}${month}${random}`;
  }
});

const Maintenance = mongoose.models.Maintenance || mongoose.model('Maintenance', maintenanceSchema);
export default Maintenance;