import Leave from '../models/Leave.js';
import Student from '../models/Student.js';

// Apply leave
export const applyLeave = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const leave = await Leave.create({
      ...req.body,
      student: student._id
    });
    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get student's leaves
export const getStudentLeaves = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user.id });
    const leaves = await Leave.find({ student: student._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave details
export const getLeaveDetails = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('student');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all leaves (admin/warden)
export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "name email phone"
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: leaves
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve leave
export const approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        'wardenApproval.status': 'approved',
        'wardenApproval.approvedBy': req.user.id,
        'wardenApproval.approvedAt': new Date(),
        'wardenApproval.remarks': req.body.remarks
      },
      { new: true }
    );
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject leave
export const rejectLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        'wardenApproval.status': 'rejected',
        'wardenApproval.approvedBy': req.user.id,
        'wardenApproval.approvedAt': new Date(),
        'wardenApproval.remarks': req.body.remarks
      },
      { new: true }
    );
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel leave
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get leave statistics
export const getLeaveStatistics = async (req, res) => {
  try {
    const stats = await Leave.aggregate([
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