import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, enum: ["online", "cash", "bank"], default: "online" },
  transactionId: { type: String, sparse: true },
  receiptId: { type: String, sparse: true },
  paidBy: { type: String, enum: ["student", "parent", "warden", "admin"], default: "student" },
  notes: String
}, { _id: false });

const feeSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  
  rent: { type: Number, default: 4000 },
  food: { type: Number, default: 2000 },
  electricity: { type: Number, default: 500 },
  mess: { type: Number, default: 3000 },
  
  baseAmount: { type: Number, default: 0 },
  fineAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  
  dueDate: { type: Date, required: true },
  paidDate: Date,
  
  fineType: { type: String, enum: ['per_day', 'fixed', 'percentage'], default: 'per_day' },
  finePerDay: { type: Number, default: 10 },
  fixedFine: { type: Number, default: 100 },
  finePercentage: { type: Number, default: 5 },
  
  status: { type: String, enum: ['paid', 'partial', 'pending', 'overdue'], default: 'pending' },
  
  payments: [paymentSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

feeSchema.methods.calculateFine = function() {
  const today = new Date();
  const due = new Date(this.dueDate);
  if (today <= due || this.status === 'paid') return this.fineAmount;
  const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  
  switch(this.fineType) {
    case 'per_day': return daysLate * this.finePerDay;
    case 'fixed': return this.fixedFine;
    case 'percentage': return (this.baseAmount * this.finePercentage / 100);
    default: return daysLate * this.finePerDay;
  }
};

feeSchema.pre('save', function(next) {
  this.baseAmount = this.rent + this.food + this.electricity + this.mess;
  this.fineAmount = this.calculateFine();
  this.totalAmount = this.baseAmount + this.fineAmount;
  this.dueAmount = this.totalAmount - this.paidAmount;
  
  const today = new Date();
  if (this.paidAmount >= this.totalAmount) this.status = 'paid';
  else if (this.paidAmount > 0) this.status = 'partial';
  else if (today > this.dueDate) this.status = 'overdue';
  else this.status = 'pending';
  next();
});

export default mongoose.model("Fee", feeSchema);