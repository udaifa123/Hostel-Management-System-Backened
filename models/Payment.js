import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  feeId: { type: mongoose.Schema.Types.ObjectId, ref: "Fee", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  studentName: String,
  studentEmail: String,
  parentId: mongoose.Schema.Types.ObjectId,
  month: String,
  year: Number,
  amount: { type: Number, required: true },
  fineAmount: { type: Number, default: 0 },
  transactionId: { type: String, unique: true },
  receiptId: { type: String, unique: true },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'razorpay', 'cash', 'bank_transfer', 'card'],
    default: 'paypal'
  },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'success' },
  paidBy: { type: String, enum: ['student', 'parent', 'warden', 'admin'] },
  notes: String,
  paymentDetails: { type: Object, default: {} },
  paymentDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model("Payment", paymentSchema);