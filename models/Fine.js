import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  feeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee'
  },
  studentName: String,
  
  fineType: {
    type: String,
    enum: ['late', 'attendance', 'manual', 'damage', 'rule_violation', 'other'],
    required: true
  },
  
  amount: { type: Number, required: true },
  percentage: { type: Number },
  
  reason: { type: String, required: true },
  description: String,
  
  daysLate: Number,
  attendancePercentage: Number,
  
  status: {
    type: String,
    enum: ['pending', 'paid', 'waived'],
    default: 'pending'
  },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByName: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  waivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  waivedReason: String,
  waivedAt: Date,
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Fine = mongoose.models.Fine || mongoose.model('Fine', fineSchema);
export default Fine;