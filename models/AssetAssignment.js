import mongoose from 'mongoose';

const assetAssignmentSchema = new mongoose.Schema({
  assetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  assignmentType: {
    type: String,
    enum: ['room', 'student', 'common'],
    default: 'common'
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'damaged', 'lost'],
    default: 'active'
  },
  returnDate: Date,
  condition: String,
  remarks: String
}, { timestamps: true });

const AssetAssignment = mongoose.model('AssetAssignment', assetAssignmentSchema);
export default AssetAssignment;