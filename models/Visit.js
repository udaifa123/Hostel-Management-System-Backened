// import mongoose from 'mongoose';

// const visitSchema = new mongoose.Schema({
//   parentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   parentName: {
//     type: String,
//     required: true
//   },
//   studentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Student',
//     required: true
//   },
//   studentName: {
//     type: String,
//     required: true
//   },
//   hostelId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Hostel'
//   },
//   wardenId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Warden'
//   },
//   visitDate: {
//     type: Date,
//     required: true
//   },
//   purpose: {
//     type: String,
//     required: true
//   },
//   numberOfVisitors: {
//     type: Number,
//     default: 1
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
//     default: 'pending'
//   },
//   rejectionReason: String,
//   approvedBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   approvedAt: Date,
//   checkInTime: Date,
//   checkOutTime: Date,
//   requestedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, {
//   timestamps: true
// });

// const Visit = mongoose.model('Visit', visitSchema);
// export default Visit;