import User from "../models/User.js";
import Hostel from "../models/Hostel.js";
import Student from "../models/Student.js";
import Complaint from "../models/Complaint.js";
import Attendance from "../models/Attendance.js";
import Room from "../models/Room.js";
import Leave from "../models/Leave.js";
import VisitRequest from "../models/VisitRequest.js";
import Message from "../models/Message.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ==================== DASHBOARD ====================

// @desc    Get warden dashboard
// @route   GET /api/warden/dashboard
// In wardenController.js, update getWardenDashboard function

export const getWardenDashboard = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    const students = await Student.find({ hostel: warden.hostel._id })
      .populate('user', 'name email phone')
      .populate('room', 'roomNumber');
    
    const complaints = await Complaint.find({ 
      student: { $in: students.map(s => s._id) } 
    })
    .populate('student', 'user name')
    .sort({ createdAt: -1 })
    .limit(5);
    
    const leaves = await Leave.find({ 
      student: { $in: students.map(s => s._id) },
      status: 'pending'
    })
    .populate('student', 'user name')
    .sort({ createdAt: -1 })
    .limit(5);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      date: { $gte: today }
    });
    
    const todayPresent = todayAttendance.filter(a => a.status === 'present').length;
    const todayAbsent = todayAttendance.filter(a => a.status === 'absent').length;
    const attendancePercentage = students.length > 0 
      ? Math.round((todayPresent / students.length) * 100) 
      : 0;
    
    const totalRooms = await Room.countDocuments({ hostel: warden.hostel._id });
    const occupiedRooms = await Room.countDocuments({ 
      hostel: warden.hostel._id,
      occupants: { $ne: [] }
    });
    
    const visitorsToday = await VisitRequest.countDocuments({ 
      studentId: { $in: students.map(s => s._id) },
      status: 'approved',
      visitDate: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        warden: {
          name: warden.name,
          email: warden.email,
          hostel: warden.hostel
        },
        stats: {
          totalStudents: students.length,
          totalRooms,
          occupiedRooms,
          availableRooms: totalRooms - occupiedRooms,
          pendingComplaints: complaints.filter(c => c.status === 'pending').length,
          pendingLeaves: leaves.length,
          visitorsToday,
          todayPresent,
          todayAbsent,
          attendancePercentage
        },
        recentComplaints: complaints,
        recentLeaves: leaves,
        recentStudents: students.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Warden dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== STUDENT MANAGEMENT ====================

// @desc    Get all students in warden's hostel
// @route   GET /api/warden/students
export const getHostelStudents = async (req, res) => {
  try {

    const warden = await User.findById(req.user.id).populate("hostel");

    if (!warden.hostel) {
      return res.status(404).json({
        success:false,
        message:"No hostel assigned"
      });
    }

    const students = await Student.find({
      hostel: warden.hostel._id
    })
    .populate("user","name email phone")
    .populate("room","roomNumber block")
    .sort({ createdAt:-1 });

    res.json({
      success:true,
      students:students,
      count:students.length
    });

  } catch (error) {

    console.error("Error fetching students:",error);

    res.status(500).json({
      success:false,
      message:error.message
    });

  }
};

// ==================== CREATE STUDENT ====================
// @desc    Create a new student
// @route   POST /api/warden/students
// @access  Private (Warden only)
export const createStudent = async (req, res) => {
  try {

    const {
      name,
      email,
      password,
      phone,
      parentPhone,
      address,
      rollNumber,
      course,
      branch,
      year,
      semester,
      batch,
      roomNumber,
      block
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password required"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    // Get warden
    const warden = await User.findById(req.user.id).populate("hostel");

    if (!warden || !warden.hostel) {
      return res.status(400).json({
        success: false,
        message: "Warden hostel not assigned"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "student",
      phone,
      hostel: warden.hostel._id
    });

    // Room logic
    let room = null;

    if (roomNumber) {

      room = await Room.findOne({
        roomNumber,
        hostel: warden.hostel._id
      });

      if (!room) {

        room = await Room.create({
          roomNumber,
          block: block || "A",
          hostel: warden.hostel._id,
          capacity: 3,
          occupants: []
        });

      }

      if (room.occupants.length >= room.capacity) {

        return res.status(400).json({
          success: false,
          message: "Room full"
        });

      }

    }

    const student = await Student.create({

      user: user._id,
      rollNumber,
      course,
      branch,
      year,
      semester,
      batch,
      phone,
      parentPhone,
      address,
      hostel: warden.hostel._id,
      room: room ? room._id : null

    });

    if (room) {

      await Room.findByIdAndUpdate(room._id,{
        $addToSet:{ occupants: user._id }
      });

    }

  const populatedStudent = await Student.findById(student._id)
  .populate("user", "name email phone")
  .populate("room", "roomNumber block");

res.status(201).json({
  success: true,
  message: "Student created successfully",
  student: populatedStudent
});

  } catch (error) {

    console.error("Create student error:",error);

    res.status(500).json({
      success:false,
      message:error.message
    });

  }
};

// ==================== ATTENDANCE ====================

// @desc    Mark attendance
// @route   POST /api/warden/attendance
export const markAttendance = async (req, res) => {
  try {
    const { studentId, status, remarks } = req.body;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if attendance already marked for today
    const existing = await Attendance.findOne({
      student: studentId,
      date: today
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for today"
      });
    }

    const attendance = await Attendance.create({
      student: studentId,
      date: today,
      status,
      remarks,
      markedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get attendance report
// @route   GET /api/warden/attendance/report
export const getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const warden = await User.findById(req.user.id).populate('hostel');
    const students = await Student.find({ hostel: warden.hostel._id }).select('_id');
    const studentIds = students.map(s => s._id);

    const query = { student: { $in: studentIds } };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'registrationNumber')
      .populate('markedBy', 'name')
      .sort('-date');

    res.json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    console.error("Error getting attendance report:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== COMPLAINTS ====================

// @desc    Update complaint status
// @route   PUT /api/warden/complaints/:id
// export const updateComplaintStatus = async (req, res) => {
//   try {
//     const { status, response } = req.body;
    
//     const complaint = await Complaint.findByIdAndUpdate(
//       req.params.id,
//       { 
//         status, 
//         response,
//         $push: { 
//           timeline: { 
//             status, 
//             remark: response || `Status changed to ${status}`, 
//             updatedBy: req.user.id,
//             updatedAt: new Date()
//           } 
//         }
//       },
//       { new: true }
//     ).populate('student');

//     if (!complaint) {
//       return res.status(404).json({
//         success: false,
//         message: "Complaint not found"
//       });
//     }

//     res.json({
//       success: true,
//       data: complaint
//     });
//   } catch (error) {
//     console.error("Error updating complaint:", error);
//     res.status(500).json({ 
//       success: false, 
//       message: error.message 
//     });
//   }
// };

// ==================== LEAVE MANAGEMENT ====================

// @desc    Get pending leaves
// @route   GET /api/warden/leaves/pending
export const getPendingLeaves = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    // Get all students in this hostel
    const students = await Student.find({ hostel: warden.hostel._id }).select('_id');
    const studentIds = students.map(s => s._id);

    const leaves = await Leave.find({ 
      student: { $in: studentIds },
      status: 'pending'
    })
    .populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'name email phone'
      }
    })
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    console.error("Error getting pending leaves:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Approve leave
// @route   PUT /api/warden/leaves/:id/approve
export const approveLeave = async (req, res) => {
  try {
    const { remarks } = req.body;
    
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved',
        'wardenApproval.status': 'approved',
        'wardenApproval.approvedBy': req.user.id,
        'wardenApproval.approvedAt': new Date(),
        'wardenApproval.remarks': remarks || 'Approved by warden'
      },
      { new: true }
    ).populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    // Send notification to student
    try {
      const Notification = (await import('../models/Notification.js')).default;
      await Notification.create({
        recipient: leave.student.user._id,
        type: 'leave',
        title: 'Leave Approved',
        message: `Your leave request has been approved`,
        data: {
          referenceId: leave._id,
          referenceModel: 'Leave'
        }
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      success: true,
      message: "Leave approved successfully",
      data: leave
    });
  } catch (error) {
    console.error("Error approving leave:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Reject leave
// @route   PUT /api/warden/leaves/:id/reject
export const rejectLeave = async (req, res) => {
  try {
    const { remarks } = req.body;
    
    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }
    
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        'wardenApproval.status': 'rejected',
        'wardenApproval.approvedBy': req.user.id,
        'wardenApproval.approvedAt': new Date(),
        'wardenApproval.remarks': remarks
      },
      { new: true }
    ).populate({
      path: 'student',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found"
      });
    }

    // Send notification to student
    try {
      const Notification = (await import('../models/Notification.js')).default;
      await Notification.create({
        recipient: leave.student.user._id,
        type: 'leave',
        title: 'Leave Rejected',
        message: `Your leave request has been rejected: ${remarks}`,
        data: {
          referenceId: leave._id,
          referenceModel: 'Leave'
        }
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    res.json({
      success: true,
      message: "Leave rejected successfully",
      data: leave
    });
  } catch (error) {
    console.error("Error rejecting leave:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== VISITOR MANAGEMENT ====================

// @desc    Get pending visitors
// @route   GET /api/warden/visitors/pending
// Add these to wardenController.js if not already present

// @desc    Get pending visitors
export const getPendingVisitors = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    const students = await Student.find({ hostel: warden.hostel._id }).select('_id');
    const studentIds = students.map(s => s._id);

    const visitors = await VisitRequest.find({ 
      studentId: { $in: studentIds },
      status: 'pending'
    })
    .populate({
      path: 'studentId',
      populate: {
        path: 'user',
        select: 'name email'
      }
    })
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: visitors.length,
      data: visitors
    });
  } catch (error) {
    console.error("Error getting pending visitors:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Approve visitor
export const approveVisitor = async (req, res) => {
  try {
    const { meetingLocation, remarks, timeSlot } = req.body;
    
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        meetingLocation: meetingLocation || 'visitor_room',
        wardenRemark: remarks,
        timeSlot: timeSlot || {},
        updatedAt: new Date()
      },
      { new: true }
    ).populate({
      path: 'studentId',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit request not found"
      });
    }

    // Send notification to student
    try {
      await Notification.create({
        recipient: visit.studentId.user._id,
        type: 'visit',
        title: 'Visit Approved',
        message: `Your visit request has been approved for ${new Date(visit.visitDate).toLocaleDateString()}`,
        data: {
          referenceId: visit._id,
          referenceModel: 'VisitRequest'
        }
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // Send notification to parent if parent created
    if (visit.parentId) {
      await Notification.create({
        recipient: visit.parentId,
        type: 'visit',
        title: 'Visit Approved',
        message: `Your visit request has been approved`,
        data: {
          referenceId: visit._id,
          referenceModel: 'VisitRequest'
        }
      });
    }

    res.json({
      success: true,
      message: "Visit approved successfully",
      data: visit
    });
  } catch (error) {
    console.error("Error approving visitor:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Reject visitor
export const rejectVisitor = async (req, res) => {
  try {
    const { remarks } = req.body;
    
    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }
    
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectionReason: remarks,
        updatedAt: new Date()
      },
      { new: true }
    ).populate({
      path: 'studentId',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit request not found"
      });
    }

    // Send notification to student
    try {
      await Notification.create({
        recipient: visit.studentId.user._id,
        type: 'visit',
        title: 'Visit Rejected',
        message: `Your visit request has been rejected: ${remarks}`,
        data: {
          referenceId: visit._id,
          referenceModel: 'VisitRequest'
        }
      });
    } catch (notifError) {
      console.error('Notification error:', notifError);
    }

    // Send notification to parent if parent created
    if (visit.parentId) {
      await Notification.create({
        recipient: visit.parentId,
        type: 'visit',
        title: 'Visit Rejected',
        message: `Your visit request has been rejected: ${remarks}`,
        data: {
          referenceId: visit._id,
          referenceModel: 'VisitRequest'
        }
      });
    }

    res.json({
      success: true,
      message: "Visit rejected successfully",
      data: visit
    });
  } catch (error) {
    console.error("Error rejecting visitor:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get active visits (today's approved visits)
export const getActiveVisits = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    const students = await Student.find({ hostel: warden.hostel._id }).select('_id');
    const studentIds = students.map(s => s._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const visits = await VisitRequest.find({ 
      studentId: { $in: studentIds },
      status: 'approved',
      visitDate: { $gte: today, $lt: tomorrow }
    })
    .populate({
      path: 'studentId',
      populate: {
        path: 'user',
        select: 'name email'
      }
    })
    .sort({ visitDate: 1 });

    res.json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (error) {
    console.error("Error getting active visits:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Check-in visitor
export const checkinVisitor = async (req, res) => {
  try {
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      { 
        checkInTime: new Date(),
        visited: true,
        status: 'completed',
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Visitor checked in successfully",
      data: visit
    });
  } catch (error) {
    console.error("Error checking in visitor:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Check-out visitor
export const checkoutVisitor = async (req, res) => {
  try {
    const visit = await VisitRequest.findByIdAndUpdate(
      req.params.id,
      { 
        checkOutTime: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Visitor checked out successfully",
      data: visit
    });
  } catch (error) {
    console.error("Error checking out visitor:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== CHAT SYSTEM ====================

// @desc    Get student messages
// @route   GET /api/warden/messages/students
export const getStudentMessages = async (req, res) => {
  try {
    // Get all students in warden's hostel
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    const students = await Student.find({ hostel: warden.hostel._id })
      .populate('user', 'name email')
      .select('_id');

    const studentIds = students.map(s => s.user._id);

    // Get latest messages with each student
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user.id, receiver: { $in: studentIds } },
            { sender: { $in: studentIds }, receiver: req.user.id }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user.id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    res.json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Send message to student
// @route   POST /api/warden/messages/send
export const sendMessageToStudent = async (req, res) => {
  try {
    const { studentId, content, attachments } = req.body;
    
    const message = await Message.create({
      sender: req.user.id,
      receiver: studentId,
      content,
      attachments: attachments || []
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name role')
      .populate('receiver', 'name role');

    // Send real-time notification via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${studentId}`).emit('new_message', populatedMessage);
    }

    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};



// ==================== GET COMPLAINTS ====================
// @desc    Get all complaints in warden's hostel
// @route   GET /api/warden/complaints
// @access  Private (Warden only)
// ==================== GET COMPLAINTS ====================
export const getComplaints = async (req, res) => {
  try {
    console.log("📋 Fetching complaints for warden...");
    
    const warden = await User.findById(req.user.id).populate("hostel");

    if (!warden.hostel) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    const students = await Student.find({ hostel: warden.hostel._id });
    const studentIds = students.map(s => s._id);

    const complaints = await Complaint.find({
      student: { $in: studentIds }
    })
      .populate({
        path: "student",
        populate: {
          path: "user",
          select: "name email phone"
        }
      })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${complaints.length} complaints`);

    res.json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    console.error("Complaint fetch error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== UPDATE COMPLAINT STATUS ====================
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, response } = req.body;
    
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        response,
        $push: { 
          timeline: { 
            status, 
            remark: response || `Status changed to ${status}`, 
            updatedBy: req.user.id,
            updatedAt: new Date()
          } 
        }
      },
      { new: true }
    ).populate('student');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found"
      });
    }

    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error("Error updating complaint:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};




// ==================== PROFILE MANAGEMENT ====================

// @desc    Get warden profile
// @route   GET /api/warden/profile
// @access  Private (Warden only)
export const getWardenProfile = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id)
      .select('-password')
      .populate('hostel', 'name code address');

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    // Get additional warden details
    const wardenDetails = {
      name: warden.name,
      email: warden.email,
      phone: warden.phone || '',
      employeeId: warden.employeeId || 'EMP' + Math.floor(Math.random() * 10000),
      department: warden.department || 'Hostel Management',
      designation: warden.designation || 'Senior Warden',
      joinDate: warden.joinDate ? warden.joinDate.toISOString().split('T')[0] : '2023-01-15',
      hostelName: warden.hostel?.name || 'Not Assigned',
      blockName: warden.blockName || 'Block A',
      officeAddress: warden.officeAddress || warden.hostel?.address || 'Hostel Complex',
      city: warden.city || 'Mumbai',
      state: warden.state || 'Maharashtra',
      pincode: warden.pincode || '400001',
      emergencyContact: warden.emergencyContact || '',
      emergencyName: warden.emergencyName || '',
      bio: warden.bio || '',
      profileImage: warden.profileImage || ''
    };

    res.json({
      success: true,
      data: wardenDetails
    });
  } catch (error) {
    console.error('Error fetching warden profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update warden profile
// @route   PUT /api/warden/profile
// @access  Private (Warden only)
export const updateWardenProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      designation,
      blockName,
      officeAddress,
      city,
      state,
      pincode,
      emergencyContact,
      emergencyName,
      bio,
      employeeId,
      joinDate
    } = req.body;

    const warden = await User.findById(req.user.id);

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    // Update fields
    if (name) warden.name = name;
    if (phone) warden.phone = phone;
    if (department) warden.department = department;
    if (designation) warden.designation = designation;
    if (blockName) warden.blockName = blockName;
    if (officeAddress) warden.officeAddress = officeAddress;
    if (city) warden.city = city;
    if (state) warden.state = state;
    if (pincode) warden.pincode = pincode;
    if (emergencyContact) warden.emergencyContact = emergencyContact;
    if (emergencyName) warden.emergencyName = emergencyName;
    if (bio) warden.bio = bio;
    if (employeeId) warden.employeeId = employeeId;
    if (joinDate) warden.joinDate = new Date(joinDate);

    await warden.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: warden.name,
        email: warden.email,
        phone: warden.phone,
        department: warden.department,
        designation: warden.designation,
        blockName: warden.blockName,
        officeAddress: warden.officeAddress,
        city: warden.city,
        state: warden.state,
        pincode: warden.pincode,
        emergencyContact: warden.emergencyContact,
        emergencyName: warden.emergencyName,
        bio: warden.bio,
        employeeId: warden.employeeId,
        joinDate: warden.joinDate
      }
    });
  } catch (error) {
    console.error('Error updating warden profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change password
// @route   POST /api/warden/change-password
// @access  Private (Warden only)
export const changeWardenPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const warden = await User.findById(req.user.id);

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, warden.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    warden.password = await bcrypt.hash(newPassword, salt);
    await warden.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SETTINGS MANAGEMENT ====================

// @desc    Get warden settings
// @route   GET /api/warden/settings
// @access  Private (Warden only)
export const getWardenSettings = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id);

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    const settings = {
      // Notification Settings
      emailNotifications: warden.emailNotifications !== false,
      pushNotifications: warden.pushNotifications !== false,
      smsNotifications: warden.smsNotifications || false,
      leaveRequests: warden.leaveRequests !== false,
      complaints: warden.complaints !== false,
      attendanceAlerts: warden.attendanceAlerts !== false,
      feeAlerts: warden.feeAlerts || false,
      dailyDigest: warden.dailyDigest !== false,
      
      // Privacy Settings
      profileVisibility: warden.profileVisibility || 'staff_only',
      showEmail: warden.showEmail !== false,
      showPhone: warden.showPhone !== false,
      showDepartment: warden.showDepartment !== false,
      
      // Theme Settings
      theme: warden.theme || 'light',
      primaryColor: warden.primaryColor || '#2e7d32',
      fontSize: warden.fontSize || 'medium',
      compactView: warden.compactView || false,
      
      // Language Settings
      language: warden.language || 'en',
      dateFormat: warden.dateFormat || 'DD/MM/YYYY',
      timeFormat: warden.timeFormat || '12h',
      
      // Security Settings
      twoFactorAuth: warden.twoFactorAuth || false,
      sessionTimeout: warden.sessionTimeout || 30,
      loginAlerts: warden.loginAlerts !== false,
      
      // Data Settings
      autoBackup: warden.autoBackup !== false,
      backupFrequency: warden.backupFrequency || 'weekly',
      dataRetention: warden.dataRetention || 90
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update warden settings
// @route   PUT /api/warden/settings
// @access  Private (Warden only)
export const updateWardenSettings = async (req, res) => {
  try {
    const updates = req.body;
    const warden = await User.findById(req.user.id);

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    // Update each setting
    const allowedSettings = [
      'emailNotifications', 'pushNotifications', 'smsNotifications',
      'leaveRequests', 'complaints', 'attendanceAlerts', 'feeAlerts', 'dailyDigest',
      'profileVisibility', 'showEmail', 'showPhone', 'showDepartment',
      'theme', 'primaryColor', 'fontSize', 'compactView',
      'language', 'dateFormat', 'timeFormat',
      'twoFactorAuth', 'sessionTimeout', 'loginAlerts',
      'autoBackup', 'backupFrequency', 'dataRetention'
    ];

    allowedSettings.forEach(setting => {
      if (updates[setting] !== undefined) {
        warden[setting] = updates[setting];
      }
    });

    await warden.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updates
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload profile image
// @route   POST /api/warden/upload-image
// @access  Private (Warden only)
export const uploadWardenImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    const warden = await User.findById(req.user.id);
    if (warden) {
      warden.profileImage = imageUrl;
      await warden.save();
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: { imageUrl }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};