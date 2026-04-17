import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema({
  qrData: {
    type: String,
    required: true,
    unique: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  sessionName: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usedBy: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    }
  }],
  metadata: {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    type: {
      type: String,
      enum: ['attendance', 'event', 'entry'],
      default: 'attendance'
    }
  }
}, {
  timestamps: true
});


qrCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const QRCode = mongoose.models.QRCode || mongoose.model('QRCode', qrCodeSchema);
export default QRCode;