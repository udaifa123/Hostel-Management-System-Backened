import Complaint from '../models/Complaint.js';
import Student from '../models/Student.js';
// import Notice from "../models/Notice.js";  

// ... rest of your imports

// Create complaint
export const createComplaint = async (req, res) => {
  try {
    console.log("🔥 Creating complaint...");
    console.log("User ID:", req.user.id);

    const student = await Student.findOne({ user: req.user.id });

    if (!student) {
      console.log("❌ Student not found!");
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const complaint = await Complaint.create({
  ...req.body,
  student: student._id
});

    console.log("✅ Complaint saved:", complaint);

    res.status(201).json({ success: true, data: complaint });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get student's complaints
export const getStudentComplaints = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const complaints = await Complaint.find({ student: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get complaint details
export const getComplaintDetails = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('student')
      .populate('assignedTo', 'name');
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all complaints (admin/warden)
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "name email phone"
        }
      })
      .sort({ createdAt: -1 });

    console.log("✅ Found", complaints.length, "complaints");

    res.json({
      success: true,
      data: complaints
    });

  } catch (error) {
    console.error("❌ Error fetching complaints:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        status: req.body.status,
        $push: { 
          timeline: { 
            status: req.body.status,
            remark: req.body.remark,
            updatedBy: req.user.id
          } 
        }
      },
      { new: true }
    );
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign complaint
export const assignComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo: req.body.assignedTo,
        assignedAt: new Date(),
        status: 'in-progress'
      },
      { new: true }
    );
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add response
export const addComplaintResponse = async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        response: req.body.response,
        status: req.body.status || 'resolved',
        resolvedAt: req.body.status === 'resolved' ? new Date() : null
      },
      { new: true }
    );
    res.json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get complaint statistics
export const getComplaintStatistics = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

