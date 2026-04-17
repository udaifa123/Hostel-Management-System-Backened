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
  

  tuitionFee: { type: Number, default: 0 },
  hostelFee: { type: Number, default: 0 },
  messFee: { type: Number, default: 0 },
  maintenanceFee: { type: Number, default: 0 },
  
  amount: { type: Number, default: 0 },
  baseAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  
  
  lateFine: { type: Number, default: 0 },
  totalFine: { type: Number, default: 0 },
  finePerDay: { type: Number, default: 10 },
  fineType: { type: String, default: 'per_day' },
  finePercentage: { type: Number, default: 2 },
  maxFine: { type: Number, default: 5000 },
  
 
  attendancePercentage: { type: Number, default: 100 },
  attendanceBasedDiscount: { type: Number, default: 0 },
  attendanceBasedPenalty: { type: Number, default: 0 },
  
 
  scholarshipPercentage: { type: Number, default: 0 },
  scholarshipAmount: { type: Number, default: 0 },
  
  
  dueDate: { type: Date, required: true },
  paidDate: Date,
  
 
  status: { type: String, default: 'pending' },
  
 
  payments: { type: Array, default: [] },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Fee = mongoose.models.Fee || mongoose.model('Fee', feeSchema);
export default Fee;