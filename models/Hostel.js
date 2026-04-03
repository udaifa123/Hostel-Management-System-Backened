import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  code: { type: String, unique: true },
  type: {
    type: String,
    enum: ['boys', 'girls', 'co-ed'],
    default: 'boys'
  },
  warden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contactNumber: String,
  totalRooms: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, {
  timestamps: true
});

const Hostel = mongoose.model('Hostel', hostelSchema);
export default Hostel;