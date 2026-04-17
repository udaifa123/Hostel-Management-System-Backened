import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'holiday'],
    default: 'absent'
  },
  timeIn: {
    type: String,
    default: null
  },
  timeOut: {
    type: String,
    default: null
  },
  remarks: {
    type: String,
    default: ''
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});


attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export default Attendance;