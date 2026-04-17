import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({

  leaveNumber: {
    type: String,
    unique: true
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  type: {
    type: String,
    enum: ["casual", "medical", "emergency", "vacation", "other"],
    required: true
  },

  reason: {
    type: String,
    required: true
  },

  fromDate: {
    type: Date,
    required: true
  },

  toDate: {
    type: Date,
    required: true
  },

  totalDays: Number,

  destination: String,

  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending"
  },


  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  approvedAt: {
    type: Date
  },

  rejectionReason: {
    type: String
  }

}, { timestamps: true });



leaveSchema.pre("save", function () {

  if (!this.leaveNumber) {

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");

    this.leaveNumber = `LEV${year}${month}${random}`;
  }

  if (this.fromDate && this.toDate) {

    const diffTime = Math.abs(this.toDate - this.fromDate);

    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

});

export default mongoose.model("Leave", leaveSchema);