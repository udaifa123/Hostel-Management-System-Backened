import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
{
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
    required: true
  },

  role: {
    type: String,
    enum: ["admin","warden","student","parent"],
    default: "student"
  },

  phone: {
    type: String,
    default: ""
  },

  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    default: null
  },

  // ✅ ADD THIS - For parents to track linked students
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
  }],

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;