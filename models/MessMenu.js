import mongoose from 'mongoose';

const messMenuSchema = new mongoose.Schema({
  hostelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  meals: {
    breakfast: [String],
    lunch: [String],
    snacks: [String],
    dinner: [String]
  },
  special: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});


messMenuSchema.index({ hostelId: 1, date: 1 }, { unique: true });

const MessMenu = mongoose.models.MessMenu || mongoose.model('MessMenu', messMenuSchema);
export default MessMenu;