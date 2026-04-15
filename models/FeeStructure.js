import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema({
  name: { type: String, default: 'Default Fee Structure' },
  
  // Fee Components
  tuitionFee: { type: Number, default: 10000 },
  hostelFee: { type: Number, default: 5000 },
  messFee: { type: Number, default: 3000 },
  maintenanceFee: { type: Number, default: 1000 },
  libraryFee: { type: Number, default: 500 },
  sportsFee: { type: Number, default: 500 },
  examFee: { type: Number, default: 1000 },
  otherFee: { type: Number, default: 0 },
  
  // Fee Type
  feeType: { type: String, enum: ['monthly', 'quarterly', 'semester', 'yearly'], default: 'monthly' },
  dueDayOfMonth: { type: Number, default: 10 },
  
  // Fine Settings
  finePerDay: { type: Number, default: 10 },
  fineType: { type: String, enum: ['per_day', 'percentage'], default: 'per_day' },
  finePercentage: { type: Number, default: 2 },
  maxFine: { type: Number, default: 5000 },
  
  // Attendance Rules
  enableAttendancePenalty: { type: Boolean, default: true },
  attendanceThreshold: { type: Number, default: 75 },
  attendancePenaltyPercentage: { type: Number, default: 5 },
  
  // Discount Rules
  enableDiscount: { type: Boolean, default: true },
  earlyPaymentDiscount: { type: Number, default: 5 },
  earlyPaymentDays: { type: Number, default: 5 },
  
  // Scholarship
  scholarshipPercentage: { type: Number, default: 0 },
  
  // Auto Generation
  autoGenerate: { type: Boolean, default: true },
  lastGeneratedMonth: { type: Number, default: 0 },
  lastGeneratedYear: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const FeeStructure = mongoose.models.FeeStructure || mongoose.model('FeeStructure', feeStructureSchema);
export default FeeStructure;