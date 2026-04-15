import mongoose from "mongoose";

const parentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  phone: {
    type: String,
    default: ""
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
  }],
  occupation: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  relation: {
    type: String,
    default: ""
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Parent = mongoose.models.Parent || mongoose.model("Parent", parentSchema);
export default Parent;