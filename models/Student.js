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
    sparse: true
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
    default: null,
    required: false
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

  warden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null  // Will assign automatically later
  },

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);


// ✅ Auto Generate Registration Number
studentSchema.pre("save", async function () {

  if (!this.registrationNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await mongoose.model("Student").countDocuments();
    this.registrationNumber =
      `STU${year}${(count + 1).toString().padStart(4, "0")}`;
  }

  // ✅ Auto-assign a default Warden if none set
if (!this.warden && this.hostel) {
  const warden = await mongoose.model("User").findOne({
    role: "warden",
    hostel: this.hostel
  });

  if (warden) {
    this.warden = warden._id;
  }
}

});

const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);

export default Student;