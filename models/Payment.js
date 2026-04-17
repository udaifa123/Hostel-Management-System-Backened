import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  feeId: mongoose.Schema.Types.ObjectId,
  studentName: String,
  registrationNumber: String,
  amount: Number,
  fineAmount: Number,
  totalAmount: Number,
  paymentMethod: String,
  transactionId: String,
  receiptNumber: String,
  paymentDate: Date,
  status: String,
  paidBy: mongoose.Schema.Types.ObjectId,
  paidByRole: String,
  notes: String
}, { 
  timestamps: true,
  autoIndex: false,  
  autoCreate: false   
});


paymentSchema.index({});

const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);


(async () => {
  try {
    await Payment.collection.dropIndexes();
    console.log('✅ Dropped all indexes on payments collection');
  } catch(e) {
    
  }
})();

export default Payment;