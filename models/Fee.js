import mongoose from 'mongoose';

const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  studentEmail: String,
  registrationNumber: String,
  feeType: { type: String, default: 'monthly' },
  month: { type: Number },
  year: { type: Number, required: true },
  title: { type: String, default: '' },
  
  // Fee Components
  tuitionFee: { type: Number, default: 0 },
  hostelFee: { type: Number, default: 0 },
  messFee: { type: Number, default: 0 },
  maintenanceFee: { type: Number, default: 0 },
  
  amount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  
  // Fines
  lateFine: { type: Number, default: 0 },
  totalFine: { type: Number, default: 0 },
  finePerDay: { type: Number, default: 10 },
  
  // Attendance
  attendancePercentage: { type: Number, default: 100 },
  
  // Scholarship
  scholarshipPercentage: { type: Number, default: 0 },
  
  // Dates
  dueDate: { type: Date, required: true },
  paidDate: Date,
  
  // Status
  status: { type: String, default: 'pending' },
  
  // Payments
  payments: { type: Array, default: [] },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// NO PRE-SAVE MIDDLEWARE - REMOVED COMPLETELY

const Fee = mongoose.models.Fee || mongoose.model('Fee', feeSchema);
export default Fee;