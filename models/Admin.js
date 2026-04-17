import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false 
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: ['manage_hostels','manage_wardens','manage_students','manage_fees','view_reports','manage_settings']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;