// models/VisitRequest.js
import mongoose from 'mongoose';

const visitRequestSchema = new mongoose.Schema({
  // Parent details
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  parentName: {
    type: String
  },
  
  // Student details
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String
  },
  studentRollNo: {
    type: String
  },
  hostelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel'
  },
  hostelName: {
    type: String
  },
  roomNumber: {
    type: String
  },
  
  // Visitor details
  visitorName: {
    type: String,
    required: true
  },
  relation: {
    type: String,
    enum: ['Father', 'Mother', 'Sibling', 'Friend', 'Relative', 'Other'],
    required: true
  },
  visitorPhone: {
    type: String,
    required: true
  },
  visitorEmail: {
    type: String
  },
  
  // Visit details
  visitDate: {
    type: Date,
    required: true
  },
  visitTime: {
    type: String
  },
  purpose: {
    type: String,
    required: true
  },
  numberOfVisitors: {
    type: Number,
    default: 1
  },
  
  // Warden details
  wardenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  wardenName: {
    type: String
  },
  
  // Approval details
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  wardenRemark: String,
  timeSlot: {
    startTime: String,
    endTime: String
  },
  
  // Security details
  gatePassId: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCode: {
    type: String
  },
  checkInTime: Date,
  checkOutTime: Date,
  visited: {
    type: Boolean,
    default: false
  },
  
  // Request source
  requestedBy: {
    type: String,
    enum: ['student', 'parent'],
    default: 'parent'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Generate gate pass ID only when approved
visitRequestSchema.pre('save', function() {
  if (this.status === 'approved' && !this.gatePassId) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    this.gatePassId = `GP${year}${month}${day}${random}`;
  }
});

// Drop the problematic index if it exists
// Run this in MongoDB: db.visitrequests.dropIndex("requestNumber_1")

export default mongoose.model('VisitRequest', visitRequestSchema);