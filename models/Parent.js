import mongoose from 'mongoose';

const parentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  phone: {
    type: String,
    required: true
  },
  alternatePhone: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  occupation: String,
  relationship: {
    type: String,
    enum: ['father', 'mother', 'guardian', 'other'],
    default: 'guardian'
  },
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Parent = mongoose.models.Parent || mongoose.model('Parent', parentSchema);
export default Parent;