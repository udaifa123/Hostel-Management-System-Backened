import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true,
    unique: true
  },
  roomType: {
    type: String,
    enum: ['single', 'double', 'triple', 'dormitory'],
    default: 'double'
  },
  monthlyRent: {
    type: Number,
    required: true,
    default: 3000
  },
  foodFee: {
    type: Number,
    required: true,
    default: 2000
  },
  electricityCharge: {
    type: Number,
    default: 0
  },
  maintenanceFee: {
    type: Number,
    default: 500
  },
  admissionFee: {
    type: Number,
    default: 0
  },
  cautionDeposit: {
    type: Number,
    default: 5000
  },
  extraCharges: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  scholarship: {
    type: Number,
    default: 0
  },
  lateFeePerDay: {
    type: Number,
    default: 20
  },
  minAttendanceRequired: {
    type: Number,
    default: 75
  },
  attendanceFinePerPoint: {
    type: Number,
    default: 10
  },
  dueDayOfMonth: {
    type: Number,
    default: 5
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
export default FeeStructure;