import Student from "../models/Student.js";
import User from "../models/User.js";
import Leave from "../models/Leave.js";
import Complaint from "../models/Complaint.js";
import Notification from "../models/Notification.js";
import VisitRequest from "../models/VisitRequest.js";
import Message from "../models/Message.js";
import Fee from "../models/Fee.js";
import mongoose from 'mongoose';



export const getDashboard = async (req, res) => {
  try {

    const student = await Student
      .findOne({ user: req.user._id })
      .populate("hostel")
      .populate("room");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const unreadNotifications = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    const pendingLeaves = await Leave.countDocuments({
      student: student._id,
      status: "pending"
    });

    const pendingVisits = await VisitRequest.countDocuments({
      student: student._id,
      status: "pending"
    });

    const unreadMessages = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false
    });

    res.json({
      studentName: req.user.name,
      semester: student.semester,
      hostelName: student.hostel?.name || "Not Assigned",
      roomNumber: student.room?.roomNumber || "Not Assigned",
      unreadMessages,
      pendingVisits,
      unreadNotifications,
      pendingLeaves
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




export const getStudentProfile = async (req, res) => {
  try {
    console.log("📋 Fetching student profile...");
    
    const student = await Student.findOne({ user: req.user._id })
      .populate("user")
      .populate("hostel")
      .populate("room");

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student profile not found" 
      });
    }

   
    let formattedDateOfBirth = '';
    if (student.dateOfBirth) {
      try {
        formattedDateOfBirth = new Date(student.dateOfBirth).toISOString().split('T')[0];
      } catch (e) {
        console.error("Date parsing error:", e);
      }
    }

    
    res.json({
      success: true,
      data: {
        name: student.user?.name || req.user.name,
        email: student.user?.email || req.user.email,
        phone: student.user?.phone || student.phone,
        studentId: student.registrationNumber,
        enrollmentNo: student.enrollmentNumber,
        rollNumber: student.rollNumber,
        course: student.course,
        branch: student.branch,
        year: student.year,
        semester: student.semester,
        roomNo: student.room?.roomNumber || student.roomNumber,
        roomId: student.room?._id,
        hostelName: student.hostel?.name || student.hostelName,
        hostelId: student.hostel?._id,
        blockName: student.blockName,
        floorNo: student.floorNo,
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
        emergencyContact: student.emergencyContact || '',
        emergencyName: student.emergencyContactName || '',
        bloodGroup: student.bloodGroup || '',
        dateOfBirth: formattedDateOfBirth,
        gender: student.gender || '',
        admissionYear: student.admissionYear || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        parentEmail: student.parentEmail || '',
        guardianName: student.guardianName || '',
        guardianPhone: student.guadrianPhone || '',
        nationality: student.nationality || "Indian",
        religion: student.religion || '',
        caste: student.caste || '',
        aadharNo: student.aadharNo || '',
        panNo: student.panNo || '',
        profileImage: student.profileImage || student.user?.profileImage || '',
        socialLinks: student.socialLinks || {
          facebook: '', twitter: '', linkedin: '', instagram: '', github: '', website: ''
        },
        achievements: student.achievements || [],
        skills: student.skills || [],
        attendance: student.attendance || "0%",
        cgpa: student.cgpa || "0.0",
        backlogs: student.backlogs || 0,
        certifications: student.certifications || [],
        languages: student.languages || [],
        hobbies: student.hobbies || [],
        isActive: student.isActive
      }
    });

  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to fetch profile"
    });
  }
};



export const updateStudentProfile = async (req, res) => {
  try {
    console.log("📝 Updating student profile...");
    console.log("Request body:", req.body);
    
   
    let student = await Student.findOne({ user: req.user._id }).populate("user");
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }
    
   
    let userUpdated = false;
    let studentUpdated = false;
    
  
    const simpleFields = [
      'course', 'branch', 'semester', 'address', 'city', 'state', 'pincode',
      'bloodGroup', 'gender', 'admissionYear', 'parentName', 'parentPhone', 
      'parentEmail', 'guardianName', 'guardianPhone', 'nationality', 'religion',
      'caste', 'aadharNo', 'panNo', 'cgpa', 'backlogs', 'blockName', 'floorNo',
      'roomNumber', 'hostelName', 'emergencyContact', 'emergencyContactName'
    ];
    
    for (const field of simpleFields) {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
        studentUpdated = true;
      }
    }
    
   
    if (req.body.dateOfBirth) {
      student.dateOfBirth = new Date(req.body.dateOfBirth);
      studentUpdated = true;
    }
    
   
    if (req.body.name !== undefined && student.user) {
      student.user.name = req.body.name;
      userUpdated = true;
    }
    
    if (req.body.phone !== undefined && student.user) {
      student.user.phone = req.body.phone;
      userUpdated = true;
    }
    
    
    if (req.body.enrollmentNo !== undefined) {
      student.enrollmentNumber = req.body.enrollmentNo;
      studentUpdated = true;
    }
    
    
    if (req.body.studentId !== undefined) {
      student.registrationNumber = req.body.studentId;
      studentUpdated = true;
    }
    
    
    if (req.body.skills && Array.isArray(req.body.skills)) {
      student.skills = req.body.skills;
      studentUpdated = true;
    }
    
    if (req.body.languages && Array.isArray(req.body.languages)) {
      student.languages = req.body.languages;
      studentUpdated = true;
    }
    
    if (req.body.hobbies && Array.isArray(req.body.hobbies)) {
      student.hobbies = req.body.hobbies;
      studentUpdated = true;
    }
    
    if (req.body.achievements && Array.isArray(req.body.achievements)) {
      student.achievements = req.body.achievements;
      studentUpdated = true;
    }
    
    
    if (req.body.socialLinks && typeof req.body.socialLinks === 'object') {
      student.socialLinks = { ...student.socialLinks, ...req.body.socialLinks };
      studentUpdated = true;
    }
    
   
    if (userUpdated && student.user) {
      await student.user.save();
      console.log("✅ User data updated");
    }
    
    if (studentUpdated) {
      await student.save();
      console.log("✅ Student data updated");
    }
    
    
    const updatedStudent = await Student.findOne({ user: req.user._id })
      .populate("user")
      .populate("hostel")
      .populate("room");
    
    console.log("✅ Profile updated successfully");
    
   
    let formattedDateOfBirth = '';
    if (updatedStudent.dateOfBirth) {
      try {
        formattedDateOfBirth = new Date(updatedStudent.dateOfBirth).toISOString().split('T')[0];
      } catch (e) {}
    }
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        name: updatedStudent.user?.name || req.user.name,
        email: updatedStudent.user?.email || req.user.email,
        phone: updatedStudent.user?.phone || updatedStudent.phone,
        studentId: updatedStudent.registrationNumber,
        enrollmentNo: updatedStudent.enrollmentNumber,
        course: updatedStudent.course,
        branch: updatedStudent.branch,
        semester: updatedStudent.semester,
        roomNo: updatedStudent.room?.roomNumber || updatedStudent.roomNumber,
        hostelName: updatedStudent.hostel?.name || updatedStudent.hostelName,
        blockName: updatedStudent.blockName,
        floorNo: updatedStudent.floorNo,
        address: updatedStudent.address,
        city: updatedStudent.city,
        state: updatedStudent.state,
        pincode: updatedStudent.pincode,
        emergencyContact: updatedStudent.emergencyContact,
        emergencyName: updatedStudent.emergencyContactName,
        bloodGroup: updatedStudent.bloodGroup,
        dateOfBirth: formattedDateOfBirth,
        gender: updatedStudent.gender,
        admissionYear: updatedStudent.admissionYear,
        parentName: updatedStudent.parentName,
        parentPhone: updatedStudent.parentPhone,
        parentEmail: updatedStudent.parentEmail,
        guardianName: updatedStudent.guardianName,
        guardianPhone: updatedStudent.guardianPhone,
        nationality: updatedStudent.nationality,
        religion: updatedStudent.religion,
        caste: updatedStudent.caste,
        aadharNo: updatedStudent.aadharNo,
        panNo: updatedStudent.panNo,
        profileImage: updatedStudent.profileImage,
        socialLinks: updatedStudent.socialLinks || {},
        achievements: updatedStudent.achievements || [],
        skills: updatedStudent.skills || [],
        attendance: updatedStudent.attendance,
        cgpa: updatedStudent.cgpa,
        backlogs: updatedStudent.backlogs,
        certifications: updatedStudent.certifications || [],
        languages: updatedStudent.languages || [],
        hobbies: updatedStudent.hobbies || []
      }
    });
    
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to update profile"
    });
  }
};


export const getLeaves = async (req, res) => {
  try {

    const student = await Student.findOne({ user: req.user._id });

    const leaves = await Leave
      .find({ student: student._id })
      .sort({ createdAt: -1 });

    res.json(leaves);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const applyLeave = async (req, res) => {
  try {

    const student = await Student.findOne({ user: req.user._id });

    const leave = await Leave.create({
      student: student._id,
      type: req.body.type,
      reason: req.body.reason,
      fromDate: req.body.fromDate,
      toDate: req.body.toDate,
      destination: req.body.destination,
      emergencyContact: req.body.emergencyContact
    });

    res.status(201).json({
      message: "Leave applied successfully",
      leave
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getComplaints = async (req, res) => {
  try {
    console.log("📋 Fetching complaints for student...");
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    const complaints = await Complaint
      .find({ student: student._id })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${complaints.length} complaints`);
    
    res.json({
      success: true,
      data: complaints
    });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

export const createComplaint = async (req, res) => {
  try {
    console.log("🔥 Creating complaint...");
    const student = await Student.findOne({ user: req.user._id });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    const complaint = await Complaint.create({
      student: student._id,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'other',
      priority: req.body.priority || 'medium',
      location: req.body.location || {},
      isAnonymous: req.body.isAnonymous || false,
      status: 'pending',
      timeline: [{
        status: 'pending',
        remark: 'Complaint submitted',
        updatedAt: new Date()
      }]
    });

    console.log("✅ Complaint saved:", complaint._id);

    
    try {
      const warden = await User.findOne({ 
        role: 'warden',
        hostel: student.hostel 
      });
      
      if (warden) {
        const Notification = await import('../models/Notification.js');
        await Notification.default.create({
          recipient: warden._id,
          type: 'complaint',
          title: 'New Complaint',
          message: `New complaint from ${req.user.name}: ${complaint.title}`,
          data: { referenceId: complaint._id, referenceModel: 'Complaint' }
        });
      }
    } catch (notifError) {
      console.error("Notification error:", notifError.message);
    }

    res.status(201).json({ 
      success: true, 
      message: "Complaint submitted successfully",
      data: complaint 
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    console.log("📋 Fetching notifications for user:", req.user._id);
    
    const notifications = await Notification
      .find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${notifications.length} notifications`);
    
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    console.log("📝 Marking notification as read:", req.params.id);
    
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ 
        success: false, 
        message: "Notification not found" 
      });
    }

    console.log("✅ Notification marked as read");
    
    res.json({ 
      success: true, 
      data: notification 
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    console.log("📝 Marking all notifications as read for user:", req.user._id);
    
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
    
    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};




export const getVisits = async (req, res) => {
  try {
    console.log("📋 Fetching visits for student...");
    
    const student = await Student.findOne({ user: req.user._id });
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    const visits = await VisitRequest.find({ studentId: student._id })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${visits.length} visits for student`);

    res.json({
      success: true,
      data: visits
    });
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};




export const requestVisit = async (req, res) => {
  try {
    console.log("=".repeat(50));
    console.log("📝 REQUEST VISIT STARTED");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User ID:", req.user?._id);
    console.log("User role:", req.user?.role);
    
   
    const student = await Student.findOne({ user: req.user._id }).populate('user');

    if (!student) {
      console.log("❌ Student not found for user:", req.user._id);
      return res.status(404).json({ 
        success: false, 
        message: "Student profile not found. Please contact admin." 
      });
    }

    console.log("✅ Student found:", student._id);
    console.log("Student name:", student.user?.name);

    const { visitorName, relation, visitorPhone, visitDate, visitTime, purpose, numberOfVisitors } = req.body;

   
    const errors = [];
    if (!visitorName) errors.push("Visitor name is required");
    if (!relation) errors.push("Relation is required");
    if (!visitorPhone) errors.push("Visitor phone is required");
    if (!visitDate) errors.push("Visit date is required");

    if (errors.length > 0) {
      console.log("❌ Validation errors:", errors);
      return res.status(400).json({
        success: false,
        message: errors.join(", ")
      });
    }

    const visitData = {
      studentId: student._id,
      studentName: student.user?.name || student.name,
      studentRollNo: student.rollNumber,
      hostelId: student.hostel,
      roomNumber: student.roomNumber,
      visitorName: visitorName.trim(),
      relation: relation,
      visitorPhone: visitorPhone,
      visitDate: new Date(visitDate),
      visitTime: visitTime || "Not specified",
      purpose: purpose || "Family Visit",
      numberOfVisitors: numberOfVisitors || 1,
      status: "pending",
      requestedBy: "student",
      requestedAt: new Date()
    };

    console.log("📤 Creating visit with data:", JSON.stringify(visitData, null, 2));

    const visit = await VisitRequest.create(visitData);

    console.log("✅ Visit request created successfully!");
    console.log("Visit ID:", visit._id);
    console.log("=".repeat(50));


    try {
      const warden = await User.findOne({ role: 'warden', hostel: student.hostel });
      if (warden) {
        await Notification.create({
          recipient: warden._id,
          type: 'visit',
          title: 'New Visit Request',
          message: `${student.user?.name || student.name} requested a visit from ${visitorName}`,
          data: { referenceId: visit._id, referenceModel: 'VisitRequest' }
        });
        console.log("📢 Notification sent to warden");
      }
    } catch (notifError) {
      console.error("Notification error (non-critical):", notifError.message);
    }

    res.status(201).json({
      success: true,
      data: visit,
      message: "Visit request sent successfully"
    });
    
  } catch (error) {
    console.error("=".repeat(50));
    console.error("❌ ERROR IN REQUEST VISIT");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Full error:", error);
    console.error("=".repeat(50));
    

    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: "Duplicate entry. Please try again." 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to create visit request"
    });
  }
};



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
    
   
    const student = await Student.findOne({ user: req.user._id });
    
    if (visit.studentId?.toString() !== student._id.toString() && 
        visit.student?.toString() !== student._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this visit"
      });
    }
    
   
    if (visit.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel request that is already processed"
      });
    }
    
    visit.status = 'cancelled';
    await visit.save();
    
    res.json({
      success: true,
      message: "Visit request cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling visit:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};




export const getWardenChat = async (req, res) => {
  try {

    const messages = await Message
      .find({
        $or: [
          { sender: req.user._id },
          { receiver: req.user._id }
        ]
      })
      .sort({ createdAt: 1 });

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const sendMessage = async (req, res) => {
  try {

    const message = await Message.create({
      sender: req.user._id,
      receiver: req.body.receiverId,
      content: req.body.content
    });

    const io = req.app.get("io");

    if (io) {
      io.to(`user:${req.body.receiverId}`).emit("new_message", message);
    }

    res.status(201).json(message);

  } catch (error) {

    res.status(500).json({
      message:error.message
    });

  }
};



export const getFees = async (req, res) => {
  try {

    const student = await Student.findOne({ user: req.user._id });

    const fees = await Fee.find({ student: student._id });

    const totalFees = fees.reduce((sum, f) => sum + f.totalAmount, 0);

    const paidFees = fees
      .filter(f => f.status === "paid")
      .reduce((sum, f) => sum + f.totalAmount, 0);

    const dueFees = fees
      .filter(f => f.status !== "paid")
      .reduce((sum, f) => sum + f.totalAmount, 0);

    const nextDue = fees
      .filter(f => f.status !== "paid")
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    res.json({
      totalFees,
      paidFees,
      dueFees,
      nextDueDate: nextDue ? nextDue.dueDate : null,
      status: dueFees === 0 ? "paid" : paidFees > 0 ? "partial" : "pending"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getTransactions = async (req, res) => {
  try {

    const student = await Student.findOne({ user: req.user._id });

    const fees = await Fee
      .find({ student: student._id })
      .sort({ createdAt: -1 });

    const transactions = fees.map(fee => ({
      id: fee._id,
      date: fee.paidDate || fee.createdAt,
      description: `${fee.type} fee`,
      amount: fee.totalAmount,
      status: fee.status,
      receiptNo: fee.receiptNumber || "",
      mode: fee.paymentMethod || ""
    }));

    res.json(transactions);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getWardenInfo = async (req, res) => {
  try {

    const student = await Student
      .findOne({ user: req.user._id })
      .populate("hostel");

    if (!student || !student.hostel) {
      return res.status(404).json({
        success:false,
        message:"Hostel not assigned"
      });
    }

    const warden = await User.findOne({
      role:"warden",
      hostel:student.hostel._id
    }).select("name email");

    if (!warden) {
      return res.status(404).json({
        success:false,
        message:"Warden not found"
      });
    }

    res.json({
      success:true,
      data:warden
    });

  } catch (error) {

    console.error("Error fetching warden:",error);

    res.status(500).json({
      success:false,
      message:error.message
    });

  }
};



