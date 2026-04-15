// models/Student.js - NO PRE-SAVE MIDDLEWARE
import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
{
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    default: () => {
      const year = new Date().getFullYear().toString().slice(-2);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      return `STU${year}${random}`;
    }
  },

  enrollmentNumber: {
    type: String,
    default: () => `ENR${Date.now()}`
  },

  rollNumber: {
    type: String,
    default: ""
  },

  batch: {
    type: String,
    default: ""
  },

  course: {
    type: String,
    default: "Not Assigned"
  },

  branch: {
    type: String,
    default: "Not Assigned"
  },

  year: {
    type: Number,
    default: 1
  },

  semester: {
    type: Number,
    default: 1
  },

  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    default: null
  },

  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    default: null
  },

  phone: {
    type: String,
    default: ""
  },

  alternatePhone: {
    type: String,
    default: ""
  },

  parentPhone: {
    type: String,
    default: ""
  },

  parentEmail: {
    type: String,
    default: ""
  },

  address: {
    type: String,
    default: ""
  },

  city: {
    type: String,
    default: ""
  },

  state: {
    type: String,
    default: ""
  },

  pincode: {
    type: String,
    default: ""
  },

  emergencyContact: {
    type: String,
    default: ""
  },

  emergencyContactName: {
    type: String,
    default: ""
  },

  bloodGroup: {
    type: String,
    default: ""
  },

  dateOfBirth: {
    type: Date,
    default: null
  },

  gender: {
    type: String,
    default: ""
  },

  admissionYear: {
    type: String,
    default: ""
  },

  parentName: {
    type: String,
    default: ""
  },

  guardianName: {
    type: String,
    default: ""
  },

  guardianPhone: {
    type: String,
    default: ""
  },

  nationality: {
    type: String,
    default: "Indian"
  },

  religion: {
    type: String,
    default: ""
  },

  caste: {
    type: String,
    default: ""
  },

  aadharNo: {
    type: String,
    default: ""
  },

  panNo: {
    type: String,
    default: ""
  },

  profileImage: {
    type: String,
    default: ""
  },

  socialLinks: {
    facebook: { type: String, default: "" },
    twitter: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    instagram: { type: String, default: "" },
    github: { type: String, default: "" },
    website: { type: String, default: "" }
  },

  achievements: [{
    title: String,
    description: String,
    date: Date,
    certificate: String
  }],

  skills: [String],

  attendance: {
    type: String,
    default: "0%"
  },

  cgpa: {
    type: String,
    default: "0.0"
  },

  backlogs: {
    type: Number,
    default: 0
  },

  certifications: [String],

  languages: [String],

  hobbies: [String],

  blockName: {
    type: String,
    default: ""
  },

  floorNo: {
    type: String,
    default: ""
  },

  roomNumber: {
    type: String,
    default: ""
  },

  hostelName: {
    type: String,
    default: ""
  },

  warden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  // ✅ ADD THIS - Parent/Guardian references
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

// NO PRE-SAVE MIDDLEWARE - REMOVED COMPLETELY

const Student = mongoose.models.Student || mongoose.model("Student", studentSchema);

export default Student;