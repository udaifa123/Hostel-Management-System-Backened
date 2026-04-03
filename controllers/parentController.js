import Parent from "../models/Parent.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Complaint from "../models/Complaint.js";
import Fee from "../models/Fee.js";
import Notification from "../models/Notification.js";
import MessMenu from "../models/MessMenu.js";
import VisitRequest from "../models/VisitRequest.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import Hostel from "../models/Hostel.js";
import Notice from "../models/Notice.js";  // ✅ ADD THIS IMPORT

// ✅ GET DASHBOARD
export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const parent = await Parent.findOne({ user: userId });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent not found"
      });
    }

    if (!parent.students || parent.students.length === 0) {
      return res.json({
        success: true,
        data: {
          student: null,
          todayAttendance: "not-marked",
          pendingLeaves: 0,
          activeComplaints: 0,
          feeSummary: { totalFee: 0, paidFee: 0, pendingFee: 0 },
          unreadCount: 0,
          pendingVisits: 0
        }
      });
    }

    const studentId = parent.students[0];

    const student = await Student.findById(studentId)
      .populate("user", "name email phone")
      .populate({
        path: "room",
        populate: {
          path: "hostel",
          model: "Hostel"
        }
      })
      .populate("hostel");

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.findOne({
      student: studentId,
      date: { $gte: today, $lt: tomorrow }
    });

    // Get counts
    const pendingLeaves = await Leave.countDocuments({
      student: studentId,
      status: 'pending'
    });

    const activeComplaints = await Complaint.countDocuments({
      student: studentId,
      status: { $in: ['pending', 'in-progress'] }
    });

    // Get fee summary
    const fees = await Fee.find({ student: studentId });
    let totalFee = 0, paidFee = 0;
    fees.forEach(fee => {
      totalFee += fee.amount || 0;
      paidFee += fee.paidAmount || 0;
    });

    // Get unread notifications
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });

    // Get pending visits
    const pendingVisits = await VisitRequest.countDocuments({
      parentId: userId,
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        student: student ? {
          id: student._id,
          name: student.user?.name || student.name,
          roomNumber: student.room?.roomNumber || "N/A",
          hostelName: student.hostel?.name || "N/A",
          course: student.course || "N/A"
        } : null,
        todayAttendance: todayAttendance ? todayAttendance.status : 'not-marked',
        pendingLeaves,
        activeComplaints,
        feeSummary: {
          totalFee,
          paidFee,
          pendingFee: totalFee - paidFee
        },
        unreadCount,
        pendingVisits
      }
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET STUDENT PROFILE
export const getStudentProfile = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id || req.user.id }).populate("students");
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No student linked to this parent"
      });
    }

    const student = await Student.findById(parent.students[0])
      .populate({
        path: 'room',
        populate: { path: 'hostel', model: 'Hostel' }
      })
      .populate('user', 'name email phone');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    const room = await Room.findById(student.room).populate('hostel');
    
    res.json({
      success: true,
      data: {
        id: student._id,
        name: student.user?.name || student.name,
        email: student.user?.email || student.email,
        phoneNumber: student.phone || student.user?.phone,
        course: student.course,
        semester: student.semester,
        enrollmentNo: student.enrollmentNumber || student.enrollmentNo,
        roomNumber: room?.roomNumber || student.roomNumber,
        floor: room?.floor,
        roomType: room?.type,
        hostelName: room?.hostel?.name || student.hostelName,
        profileImage: student.profileImage,
        address: student.address,
        dateOfBirth: student.dateOfBirth,
        emergencyContact: student.emergencyContact || ''
      }
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ UPDATE STUDENT PROFILE
export const updateStudentProfile = async (req, res) => {
  try {
    const { name, phone, email, address, emergencyContact } = req.body;
    
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No student linked to this parent"
      });
    }
    
    const student = await Student.findById(parent.students[0]);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }
    
    // Update student fields
    if (name) student.name = name;
    if (phone) student.phone = phone;
    if (email) student.email = email;
    if (address) student.address = address;
    if (emergencyContact) student.emergencyContact = emergencyContact;
    
    await student.save();
    
    // Also update user if needed
    const user = await User.findById(student.userId);
    if (user) {
      if (name) user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      await user.save();
    }
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: student
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET ATTENDANCE
export const getAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Parent or student not found" 
      });
    }

    const studentId = parent.students[0];
    let query = { student: studentId };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query).sort({ date: -1 });

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    
    const attendancePercentage = totalDays > 0 
      ? ((presentDays / totalDays) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        records: attendance,
        summary: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          attendancePercentage
        }
      }
    });
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET LEAVES
export const getLeaves = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Parent or student not found" 
      });
    }

    let leaves = [];
    try {
      leaves = await Leave.find({ student: parent.students[0] })
        .populate({
          path: 'approvedBy',
          select: 'name',
          model: 'User'
        })
        .sort({ createdAt: -1 });
    } catch (populateError) {
      console.log("Populate failed, fetching without populate:", populateError.message);
      leaves = await Leave.find({ student: parent.students[0] }).sort({ createdAt: -1 });
    }

    const counts = {
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
      total: leaves.length
    };

    res.json({
      success: true,
      data: {
        leaves,
        counts
      }
    });
  } catch (err) {
    console.error("Leaves error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ✅ GET COMPLAINTS
export const getComplaints = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Parent or student not found" 
      });
    }

    const complaints = await Complaint.find({ student: parent.students[0] })
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    const counts = {
      pending: complaints.filter(c => c.status === 'pending').length,
      'in-progress': complaints.filter(c => c.status === 'in-progress').length,
      resolved: complaints.filter(c => c.status === 'resolved').length,
      total: complaints.length
    };

    res.json({
      success: true,
      data: {
        complaints,
        counts
      }
    });
  } catch (err) {
    console.error("Complaints error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET FEES
export const getFees = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Parent or student not found" 
      });
    }

    const fees = await Fee.find({ student: parent.students[0] }).sort({ dueDate: -1 });

    let totalAmount = 0;
    let paidAmount = 0;
    fees.forEach(fee => {
      totalAmount += fee.amount || 0;
      paidAmount += fee.paidAmount || 0;
    });

    const payments = fees.flatMap(fee => 
      (fee.payments || []).map(payment => ({
        ...payment.toObject(),
        feeType: fee.type,
        period: fee.period
      }))
    ).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    res.json({
      success: true,
      data: {
        summary: {
          totalAmount,
          paidAmount,
          pendingAmount: totalAmount - paidAmount,
          paidPercentage: totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(2) : 0
        },
        fees,
        payments
      }
    });
  } catch (err) {
    console.error("Fees error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// ✅ GET CHILDREN'S FEES (For Parent Fees Page)
export const getChildrenFees = async (req, res) => {
  try {
    console.log('🔵 Fetching children fees for parent');
    
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    
    if (!parent) {
      console.log('Parent not found');
      return res.json({ success: true, data: [] });
    }
    
    if (!parent.students || parent.students.length === 0) {
      console.log('No students linked to parent');
      return res.json({ success: true, data: [] });
    }
    
    const childrenData = [];
    
    for (const studentId of parent.students) {
      const student = await Student.findById(studentId);
      if (student) {
        // Find fees using studentId field
        const fees = await Fee.find({ studentId: student._id }).sort({ year: -1, month: -1 });
        
        console.log(`Found ${fees.length} fees for student ${student.name}`);
        
        const summary = fees.reduce((acc, fee) => {
          acc.totalAmount += fee.totalAmount || 0;
          acc.paidAmount += fee.paidAmount || 0;
          acc.pendingAmount += fee.dueAmount || 0;
          return acc;
        }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
        
        summary.paidPercentage = summary.totalAmount > 0 
          ? ((summary.paidAmount / summary.totalAmount) * 100).toFixed(2) 
          : 0;
        
        childrenData.push({
          child: {
            id: student._id,
            name: student.name,
            registrationNumber: student.registrationNumber,
            roomNumber: student.roomNumber,
            course: student.course,
            semester: student.semester,
            email: student.email
          },
          fees: fees.map(f => ({
            _id: f._id,
            month: f.month,
            year: f.year,
            totalAmount: f.totalAmount,
            paidAmount: f.paidAmount,
            dueAmount: f.dueAmount,
            status: f.status
          })),
          summary
        });
      }
    }
    
    console.log(`Returning data for ${childrenData.length} children`);
    res.json({ success: true, data: childrenData });
  } catch (error) {
    console.error('❌ Error in getChildrenFees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id || req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ MARK NOTIFICATION AS READ
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification not found" 
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: "Notification marked as read"
    });
  } catch (err) {
    console.error("Mark notification error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET MESS MENU
export const getMessMenu = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const parent = await Parent.findOne({ user: userId });
    
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const student = await Student.findById(parent.students[0]);
    if (!student || !student.hostel) {
      return res.json({ success: true, data: [] });
    }

    // Get mess menu for this hostel
    const menu = await MessMenu.find({ hostelId: student.hostel })
      .sort({ date: 1 })
      .limit(7);

    // Format menu for frontend
    const weeklyMenu = menu.map(item => ({
      _id: item._id,
      day: item.day,
      date: item.date,
      meals: {
        breakfast: item.meals?.breakfast || 'Not available',
        lunch: item.meals?.lunch || 'Not available',
        snacks: item.meals?.snacks || 'Not available',
        dinner: item.meals?.dinner || 'Not available'
      },
      special: item.special || ''
    }));

    res.json({
      success: true,
      data: weeklyMenu
    });
  } catch (err) {
    console.error("Mess menu error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET MESS TIMINGS
export const getMessTimings = async (req, res) => {
  try {
    // Default timings
    const timings = {
      breakfast: { start: '07:00', end: '09:00' },
      lunch: { start: '12:00', end: '14:00' },
      snacks: { start: '16:00', end: '17:00' },
      dinner: { start: '19:00', end: '21:00' }
    };
    
    res.json({
      success: true,
      data: timings
    });
  } catch (err) {
    console.error("Mess timings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ CREATE VISIT REQUEST
// ✅ CREATE VISIT REQUEST (FIXED - with all required fields)
export const createVisitRequest = async (req, res) => {
  try {
    const { 
      visitorName, 
      relation, 
      visitorPhone, 
      visitDate, 
      visitTime, 
      purpose, 
      numberOfVisitors 
    } = req.body;

    console.log("Creating parent visit request with data:", { 
      visitorName, relation, visitorPhone, visitDate, visitTime, purpose, numberOfVisitors 
    });

    // Validate required fields
    if (!visitorName || !relation || !visitorPhone || !visitDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: visitorName, relation, visitorPhone, and visitDate are required" 
      });
    }

    const userId = req.user._id || req.user.id;
    const parent = await Parent.findOne({ user: userId });

    if (!parent) {
      return res.status(404).json({ 
        success: false, 
        message: "Parent not found" 
      });
    }

    if (!parent.students || parent.students.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "No student linked to this parent" 
      });
    }

    const student = await Student.findById(parent.students[0])
      .populate('user', 'name email')
      .populate('hostel', 'name')
      .populate('room', 'roomNumber');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Get student name
    const studentName = student.user?.name || student.name || "Student";
    const studentRollNo = student.rollNumber || student.enrollmentNo || "N/A";
    const hostelName = student.hostel?.name || "N/A";
    const roomNumber = student.room?.roomNumber || "N/A";

    // Find warden for this hostel
    let warden = null;
    if (student.hostel) {
      warden = await User.findOne({ 
        role: 'warden', 
        hostel: student.hostel._id 
      });
    }

    // Create visit request with ALL required fields
    const visitRequest = await VisitRequest.create({
      // Parent details
      parentId: userId,
      parentName: user.name,
      
      // Student details
      studentId: student._id,
      studentName: studentName,
      studentRollNo: studentRollNo,
      hostelId: student.hostel?._id || null,
      hostelName: hostelName,
      roomNumber: roomNumber,
      
      // Visitor details (from request body)
      visitorName: visitorName,
      relation: relation,
      visitorPhone: visitorPhone,
      
      // Visit details
      visitDate: new Date(visitDate),
      visitTime: visitTime || null,
      purpose: purpose || 'General Visit',
      numberOfVisitors: numberOfVisitors || 1,
      
      // Warden details
      wardenId: warden?._id || null,
      wardenName: warden?.name || 'Not Assigned',
      
      // Status
      status: 'pending',
      requestedBy: 'parent',
      requestedAt: new Date()
    });

    console.log("✅ Visit request created:", visitRequest._id);

    // Notify warden
    if (warden) {
      await Notification.create({
        recipient: warden._id,
        type: 'visit',
        title: 'New Visit Request',
        message: `${user.name} requested to visit ${studentName}`,
        data: {
          referenceId: visitRequest._id,
          referenceModel: 'VisitRequest'
        }
      });
    }

    // Notify student (optional)
    if (student.user) {
      await Notification.create({
        recipient: student.user._id,
        type: 'visit',
        title: 'New Visit Request',
        message: `${user.name} has requested to visit you`,
        data: {
          referenceId: visitRequest._id,
          referenceModel: 'VisitRequest'
        }
      });
    }

    res.status(201).json({
      success: true,
      data: visitRequest,
      message: "Visit request sent successfully"
    });
  } catch (err) {
    console.error("Visit request error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// ✅ GET VISIT REQUESTS
// ✅ GET VISIT REQUESTS (FIXED - returns proper array)
export const getVisitRequests = async (req, res) => {
  try {
    const visits = await VisitRequest.find({ parentId: req.user._id || req.user.id })
      .sort({ createdAt: -1 });

    const counts = {
      pending: visits.filter(v => v.status === 'pending').length,
      approved: visits.filter(v => v.status === 'approved').length,
      rejected: visits.filter(v => v.status === 'rejected').length,
      completed: visits.filter(v => v.status === 'completed').length,
      total: visits.length
    };

    res.json({
      success: true,
      data: {
        visits: visits,  // Return visits array
        counts
      }
    });
  } catch (err) {
    console.error("Get visits error:", err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};


// ✅ CANCEL/DELETE VISIT REQUEST
export const cancelVisit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const visit = await VisitRequest.findById(id);
    
    if (!visit) {
      return res.status(404).json({
        success: false,
        message: "Visit request not found"
      });
    }
    
    // Check if the parent owns this visit
    const parent = await Parent.findOne({ user: req.user._id || req.user.id });
    
    if (visit.parentId?.toString() !== (req.user._id || req.user.id).toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this visit"
      });
    }
    
    // If status is pending, mark as cancelled
    if (visit.status === 'pending') {
      visit.status = 'cancelled';
      await visit.save();
      
      return res.json({
        success: true,
        message: "Visit request cancelled successfully"
      });
    }
    
    // If status is rejected or cancelled, allow permanent deletion
    if (visit.status === 'rejected' || visit.status === 'cancelled') {
      await VisitRequest.findByIdAndDelete(id);
      
      return res.json({
        success: true,
        message: "Visit request deleted successfully"
      });
    }
    
    return res.status(400).json({
      success: false,
      message: "Cannot cancel/delete visit request that is already processed"
    });
  } catch (error) {
    console.error("Cancel visit error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ✅ SEND MESSAGE
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    const message = await Message.create({
      sender: req.user._id || req.user.id,
      receiver: receiverId,
      content,
      isRead: false,
      isDelivered: false
    });

    await Notification.create({
      recipient: receiverId,
      type: 'chat',
      title: 'New Message',
      message: `New message from ${req.user.name}`,
      data: {
        referenceId: message._id,
        referenceModel: 'Message'
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('receive_message', message);
    }

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET CHAT HISTORY
export const getChatHistory = async (req, res) => {
  try {
    const { wardenId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id || req.user.id, receiver: wardenId },
        { sender: wardenId, receiver: req.user._id || req.user.id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name')
    .populate('receiver', 'name');

    await Message.updateMany(
      {
        sender: wardenId,
        receiver: req.user._id || req.user.id,
        isRead: false
      },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (err) {
    console.error("Chat history error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET WARDENS
export const getWardens = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id || req.user.id }).populate("students");

    if (!parent || parent.students.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const student = await Student.findById(parent.students[0]).populate("room");

    const wardens = await User.find({
      role: "warden",
      hostel: student.room?.hostel
    }).select("name email phone");

    res.json({
      success: true,
      data: wardens
    });
  } catch (err) {
    console.error("Get wardens error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ GET NOTICES (NEW - ADD THIS FUNCTION)
export const getNotices = async (req, res) => {
  try {
    console.log("📋 Fetching notices for parent...");
    
    const userId = req.user._id || req.user.id;
    const parent = await Parent.findOne({ user: userId });
    
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.json({ 
        success: true, 
        count: 0, 
        data: [] 
      });
    }
    
    const student = await Student.findById(parent.students[0]);
    
    let query = { isActive: true };
    
    // If student has a hostel, show notices for that hostel
    if (student && student.hostel) {
      query.hostel = student.hostel;
    }
    
    const notices = await Notice.find(query)
      .populate('createdBy', 'name')
      .sort({ pinned: -1, createdAt: -1 });

    console.log(`✅ Found ${notices.length} notices for parent`);

    res.json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    console.error("Error fetching notices:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};