import VisitRequest from '../models/VisitRequest.js';
import Student from '../models/Student.js';

// Create visit request
export const createVisitRequest = async (req, res) => {
  try {
    console.log("🔥 Requesting visit...");

    let student;

    // ✅ Get student from logged user
    if (req.user.role === "student") {
      student = await Student.findOne({ user: req.user._id }).populate("user");
    } else {
      student = await Student.findById(req.body.studentId).populate("user");
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const visit = await VisitRequest.create({
      ...req.body,

      // ✅ IMPORTANT FIX
      studentId: student._id,
      studentName: student.user.name,

      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: visit,
    });

  } catch (error) {
    console.error("❌ Visit error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get student's visits
export const getStudentVisits = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const visits = await VisitRequest.find({ studentId: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: visits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get visit details
export const getVisitDetails = async (req, res) => {
  try {
    const visit = await VisitRequest.findById(req.params.id)
      .populate('studentId')
      .populate('approvedBy', 'name');
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all visits (admin/warden)
export const getAllVisits = async (req, res) => {
  try {
    const visits = await VisitRequest.find().populate({
  path: 'studentId',
  populate: {
    path: 'user',
    select: 'name'
  }
}).sort({ createdAt: -1 });
    res.json({ success: true, data: visits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve visit
export const approveVisit = async (req, res) => {
  try {
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        meetingLocation: req.body.meetingLocation
      },
      { new: true }
    );
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject visit
export const rejectVisit = async (req, res) => {
  try {
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectionReason: req.body.reason
      },
      { new: true }
    );
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check-in visitor
export const checkInVisitor = async (req, res) => {
  try {
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      {
        checkInTime: new Date(),
status: 'approved' // or keep approved flow
      },
      { new: true }
    );
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check-out visitor
export const checkOutVisitor = async (req, res) => {
  try {
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      {
        checkOutTime: new Date(),
status: 'completed'
      },
      { new: true }
    );
    res.json({ success: true, data: visit });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get visit statistics
export const getVisitStatistics = async (req, res) => {
  try {
    const stats = await VisitRequest.aggregate([
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