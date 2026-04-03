import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required']
  },
  block: {
    type: String,
    required: [true, 'Block is required'],
    uppercase: true,
    enum: ['A', 'B', 'C', 'D', 'E', 'F']
  },
  floor: {
    type: Number,
    required: [true, 'Floor is required'],
    min: 1,
    max: 10
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: 1,
    max: 6,
    default: 3
  },
  occupants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance', 'vacant', 'full'],
    default: 'available'
  },
  type: {
    type: String,
    enum: ['AC', 'Non-AC'],
    default: 'Non-AC'
  },
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  }
}, {
  timestamps: true
});

// Ensure room numbers are unique per hostel
roomSchema.index({ roomNumber: 1, block: 1, hostel: 1 }, { unique: true });

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
export default Room;