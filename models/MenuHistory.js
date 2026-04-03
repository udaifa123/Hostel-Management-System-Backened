import mongoose from 'mongoose';

const menuHistorySchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  changes: [{
    day: String,
    meal: String,
    oldValue: String,
    newValue: String
  }],
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
});

const MenuHistory = mongoose.models.MenuHistory || mongoose.model('MenuHistory', menuHistorySchema);
export default MenuHistory;