import Admin from "../models/Admin.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Leave from "../models/Leave.js";
import Complaint from "../models/Complaint.js";
import Fee from "../models/Fee.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Payment from "../models/Payment.js";

// REGISTER ADMIN
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ message: "Admin already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ name, email, password: hashed });

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ 
      success: true, 
      message: "Admin registered successfully",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// LOGIN ADMIN
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ success: false, message: "Admin not found" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(400).json({ success: false, message: "Wrong password" });

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ 
      success: true, 
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// CREATE HOSTEL
export const createHostel = async (req, res) => {
  try {
    const { name, code, type, location, contactNumber, email, address, totalCapacity, facilities } = req.body;
    
    if (!name || !code || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, code and type are required" 
      });
    }

    const existingHostel = await Hostel.findOne({ 
      $or: [{ name }, { code }] 
    });
    
    if (existingHostel) {
      return res.status(400).json({ 
        success: false, 
        message: "Hostel with this name or code already exists" 
      });
    }

    const hostel = await Hostel.create({
      name,
      code,
      type,
      location: location || {},
      contactNumber: contactNumber || '',
      email: email || '',
      address: address || {},
      totalCapacity: parseInt(totalCapacity) || 0,
      facilities: facilities || [],
      createdBy: req.user._id,
    });

    res.json({ 
      success: true, 
      message: "Hostel created successfully", 
      hostel 
    });
  } catch (err) {
    console.error("Create hostel error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

// CREATE WARDEN
export const createWarden = async (req, res) => {
  try {
    const { name, email, password, hostelId, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Warden already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const warden = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "warden",
      hostel: hostelId || null,
    });

    if (hostelId) {
      await Hostel.findByIdAndUpdate(hostelId, { warden: warden._id });
    }

    return res.status(201).json({
      success: true,
      message: "Warden created successfully",
      warden: {
        _id: warden._id,
        name: warden.name,
        email: warden.email,
        phone: warden.phone,
        role: warden.role,
      },
    });

  } catch (err) {
    console.log("CreateWarden Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// UPDATE WARDEN
export const updateWarden = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, hostelId, status } = req.body;

    const existingWarden = await User.findById(id);
    if (!existingWarden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    if (email && email !== existingWarden.email) {
      const emailExists = await User.findOne({ email, role: 'warden', _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another warden'
        });
      }
    }

    const updateData = {
      name: name || existingWarden.name,
      email: email || existingWarden.email,
      phone: phone || existingWarden.phone,
      updatedAt: new Date()
    };

    if (status) {
      updateData.isActive = status === 'active';
    }

    if (hostelId !== undefined) {
      if (existingWarden.hostel) {
        await Hostel.findByIdAndUpdate(existingWarden.hostel, { $unset: { warden: 1 } });
      }
      
      if (hostelId) {
        await Hostel.findByIdAndUpdate(hostelId, { warden: id });
        updateData.hostel = hostelId;
      } else {
        updateData.hostel = null;
      }
    }

    const updatedWarden = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('hostel', 'name code');

    res.json({
      success: true,
      message: 'Warden updated successfully',
      warden: {
        _id: updatedWarden._id,
        name: updatedWarden.name,
        email: updatedWarden.email,
        phone: updatedWarden.phone,
        status: updatedWarden.isActive ? 'active' : 'inactive',
        hostel: updatedWarden.hostel ? {
          _id: updatedWarden.hostel._id,
          name: updatedWarden.hostel.name,
          code: updatedWarden.hostel.code
        } : null,
      }
    });

  } catch (err) {
    console.error('Update warden error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to update warden'
    });
  }
};

// DELETE WARDEN
export const deleteWarden = async (req, res) => {
  try {
    const { id } = req.params;

    const warden = await User.findById(id);
    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    if (warden.hostel) {
      await Hostel.findByIdAndUpdate(warden.hostel, { $unset: { warden: 1 } });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Warden deleted successfully'
    });

  } catch (err) {
    console.error('Delete warden error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete warden'
    });
  }
};

// DASHBOARD STATS
export const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalHostels = await Hostel.countDocuments();
    const totalWardens = await User.countDocuments({ role: 'warden' });
    const totalRooms = await Room.countDocuments();
    
    const rooms = await Room.find();
    const occupiedRooms = rooms.filter(room => room.students && room.students.length > 0).length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const pendingComplaints = await Complaint.countDocuments({ 
      status: { $in: ['pending', 'in-progress'] } 
    });
    
    let totalCollected = 0;
    try {
      const fees = await Fee.find({ status: 'paid' });
      totalCollected = fees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    } catch (err) {
      console.log('Fee model error:', err.message);
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newStudents = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    let monthlyFeesCollected = 0;
    try {
      const monthlyFees = await Fee.aggregate([
        {
          $match: {
            status: 'paid',
            paidAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);
      monthlyFeesCollected = monthlyFees.length > 0 ? monthlyFees[0].total : 0;
    } catch (err) {
      console.log('Error calculating monthly fees:', err.message);
    }
    
    const complaintsResolved = await Complaint.countDocuments({
      status: 'resolved',
      resolvedAt: { $gte: thirtyDaysAgo }
    });
    
    const leavesApproved = await Leave.countDocuments({
      status: 'approved',
      approvalDate: { $gte: thirtyDaysAgo }
    });
    
    const hostels = await Hostel.find().populate('warden', 'name email');
    const hostelStats = [];
    
    for (const hostel of hostels) {
      const studentCount = await User.countDocuments({
        role: 'student',
        hostel: hostel._id
      });
      
      const roomCount = await Room.countDocuments({ hostelId: hostel._id });
      
      hostelStats.push({
        id: hostel._id,
        name: hostel.name,
        code: hostel.code,
        type: hostel.type,
        totalStudents: studentCount,
        totalRooms: roomCount,
        warden: hostel.warden ? hostel.warden.name : 'Not Assigned'
      });
    }
    
    const activities = [];
    
    try {
      const recentLeaves = await Leave.find()
        .populate('studentId', 'name')
        .sort('-appliedAt')
        .limit(3);
      
      recentLeaves.forEach(leave => {
        activities.push({
          id: leave._id,
          type: 'leave',
          action: `${leave.status === 'pending' ? 'New leave request from' : 'Leave ' + leave.status}`,
          user: leave.studentId?.name || 'Unknown',
          time: formatTimeAgo(leave.appliedAt)
        });
      });
    } catch (err) {
      console.log('Error fetching leaves:', err.message);
    }
    
    try {
      const recentComplaints = await Complaint.find()
        .populate('studentId', 'name')
        .sort('-createdAt')
        .limit(3);
      
      recentComplaints.forEach(complaint => {
        activities.push({
          id: complaint._id,
          type: 'complaint',
          action: `${complaint.status === 'pending' ? 'New complaint from' : 'Complaint ' + complaint.status}`,
          user: complaint.studentId?.name || 'Unknown',
          time: formatTimeAgo(complaint.createdAt)
        });
      });
    } catch (err) {
      console.log('Error fetching complaints:', err.message);
    }
    
    try {
      const recentStudents = await User.find({ role: 'student' })
        .sort('-createdAt')
        .limit(3)
        .select('name email createdAt');
      
      recentStudents.forEach(student => {
        activities.push({
          id: student._id,
          type: 'student',
          action: 'New student registered',
          user: student.name,
          time: formatTimeAgo(student.createdAt)
        });
      });
    } catch (err) {
      console.log('Error fetching students:', err.message);
    }
    
    activities.sort((a, b) => {
      const aTime = parseTimeValue(a.time);
      const bTime = parseTimeValue(b.time);
      return bTime - aTime;
    });
    
    res.json({
      success: true,
      overview: {
        totalStudents,
        totalHostels,
        totalWardens,
        totalRooms,
        occupancyRate,
        occupiedRooms
      },
      pending: {
        leaves: pendingLeaves,
        complaints: pendingComplaints
      },
      financial: {
        totalCollected
      },
      monthly: {
        newStudents,
        feesCollected: monthlyFeesCollected,
        complaintsResolved,
        leavesApproved
      },
      hostels: hostelStats,
      recentActivities: activities.slice(0, 5)
    });
    
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

const formatTimeAgo = (date) => {
  if (!date) return 'Just now';
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};

const parseTimeValue = (timeStr) => {
  if (!timeStr || timeStr === 'Just now') return Date.now();
  const minutes = timeStr.match(/(\d+) minute/);
  if (minutes) return Date.now() - (parseInt(minutes[1]) * 60000);
  const hours = timeStr.match(/(\d+) hour/);
  if (hours) return Date.now() - (parseInt(hours[1]) * 3600000);
  const days = timeStr.match(/(\d+) day/);
  if (days) return Date.now() - (parseInt(days[1]) * 86400000);
  return 0;
};

// GET ALL HOSTELS
export const getHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().populate('warden', 'name email phone');
    res.json({ success: true, hostels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL WARDENS
export const getWardens = async (req, res) => {
  try {
    const wardens = await User.find({ role: 'warden' })
      .populate('hostel', 'name code')
      .select('-password');
    res.json({ success: true, wardens });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== STUDENT MANAGEMENT ====================
// GET ALL STUDENTS - FIXED WITH BETTER NAME FETCHING
export const getStudents = async (req, res) => {
  try {
    console.log('📋 Fetching all students...');
    
    // Get all students with populated user data
    const students = await Student.find({})
      .populate('user', 'name email phone')
      .lean();
    
    const studentsWithNames = students.map((student) => {
      // Get name from populated user field
      let userName = 'Unknown';
      let userEmail = 'N/A';
      let userPhone = 'N/A';
      
      if (student.user) {
        userName = student.user.name || 'Unknown';
        userEmail = student.user.email || 'N/A';
        userPhone = student.user.phone || 'N/A';
      } else if (student.name) {
        // Fallback to student's own name field if exists
        userName = student.name;
      }
      
      return {
        _id: student._id,
        name: userName,
        email: userEmail,
        phone: userPhone,
        registrationNumber: student.registrationNumber || 'N/A',
        course: student.course || 'N/A',
        semester: student.semester || 1,
        year: student.year || 1,
        status: student.isActive ? 'active' : 'inactive'
      };
    });
    
    console.log(`✅ Found ${studentsWithNames.length} students`);
    
    res.json({ 
      success: true, 
      students: studentsWithNames,
      count: studentsWithNames.length
    });
    
  } catch (error) {
    console.error('Error in getStudents:', error);
    res.status(500).json({ success: false, message: error.message, students: [] });
  }
};


// Add these to your adminController.js if they don't exist

// ==================== STUDENT MANAGEMENT CONTROLLERS ====================

// GET STUDENT BY ID
export const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const student = await Student.findById(id)
      .populate('user', 'name email phone')
      .populate('hostel', 'name code')
      .populate('room', 'roomNumber floor roomType');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        _id: student._id,
        name: student.user?.name || 'Unknown',
        email: student.user?.email || 'N/A',
        phone: student.user?.phone || student.phone || 'N/A',
        registrationNumber: student.registrationNumber,
        enrollmentNumber: student.enrollmentNumber,
        course: student.course,
        branch: student.branch,
        year: student.year,
        semester: student.semester,
        batch: student.batch,
        hostel: student.hostel,
        room: student.room,
        parentPhone: student.parentPhone,
        parentEmail: student.parentEmail,
        address: student.address,
        isActive: student.isActive
      }
    });
    
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// CREATE STUDENT
export const createStudent = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      password, 
      role = 'student',
      hostel: hostelId,
      room: roomId,
      course,
      year,
      admissionDate,
      attendance,
      feesStatus,
      status
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and phone are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create User document
    const hashedPassword = await bcrypt.hash(password || 'student123', 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'student'
    });

    // Create Student document
    const studentData = {
      user: user._id,
      course: course || 'Not Assigned',
      year: parseInt(year) || 1,
      semester: 1,
      isActive: status === 'active'
    };

    // Add optional fields if provided
    if (hostelId) studentData.hostel = hostelId;
    if (roomId) studentData.room = roomId;
    if (phone) studentData.phone = phone;
    if (admissionDate) studentData.admissionDate = new Date(admissionDate);

    const student = await Student.create(studentData);

    // Update room occupancy if room is assigned
    if (roomId) {
      await Room.findByIdAndUpdate(roomId, {
        $addToSet: { students: student._id }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        _id: student._id,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        course: student.course,
        year: student.year,
        status: student.isActive ? 'active' : 'inactive'
      }
    });

  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create student'
    });
  }
};

// UPDATE STUDENT
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      hostel: hostelId,
      room: roomId,
      course,
      year,
      status,
      attendance,
      feesStatus
    } = req.body;

    // Find student
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update User document if needed
    if (name || email || phone) {
      const user = await User.findById(student.user);
      if (user) {
        if (name) user.name = name;
        if (email) {
          // Check if email is taken by another user
          const emailExists = await User.findOne({ 
            email, 
            _id: { $ne: user._id } 
          });
          if (emailExists) {
            return res.status(400).json({
              success: false,
              message: 'Email already in use'
            });
          }
          user.email = email;
        }
        if (phone) user.phone = phone;
        await user.save();
      }
    }

    // Handle room assignment changes
    if (roomId && roomId !== student.room?.toString()) {
      // Remove from old room
      if (student.room) {
        await Room.findByIdAndUpdate(student.room, {
          $pull: { students: student._id }
        });
      }
      // Add to new room
      await Room.findByIdAndUpdate(roomId, {
        $addToSet: { students: student._id }
      });
      student.room = roomId;
    }

    // Update Student document
    if (course) student.course = course;
    if (year) student.year = parseInt(year);
    if (hostelId) student.hostel = hostelId;
    if (status) student.isActive = status === 'active';
    
    await student.save();

    // Get updated student with populated fields
    const updatedStudent = await Student.findById(id)
      .populate('user', 'name email phone')
      .populate('hostel', 'name code')
      .populate('room', 'roomNumber');

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: {
        _id: updatedStudent._id,
        name: updatedStudent.user?.name || 'Unknown',
        email: updatedStudent.user?.email || 'N/A',
        phone: updatedStudent.user?.phone || 'N/A',
        course: updatedStudent.course,
        year: updatedStudent.year,
        hostel: updatedStudent.hostel,
        room: updatedStudent.room,
        status: updatedStudent.isActive ? 'active' : 'inactive'
      }
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update student'
    });
  }
};

// DELETE STUDENT
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Find student
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Remove student from room
    if (student.room) {
      await Room.findByIdAndUpdate(student.room, {
        $pull: { students: student._id }
      });
    }

    // Delete the User document
    if (student.user) {
      await User.findByIdAndDelete(student.user);
    }

    // Delete the Student document
    await Student.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete student'
    });
  }
};

// GET ALL ROOMS
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    
    const transformedRooms = rooms.map(room => ({
      _id: room._id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.roomType,
      capacity: room.capacity,
      currentOccupancy: room.students ? room.students.length : 0,
      status: room.status || 'available',
      rent: room.rent,
      amenities: room.amenities || [],
      hostelId: room.hostelId,
      hostelName: room.hostelName || 'N/A'
    }));
    
    res.json({ 
      success: true, 
      rooms: transformedRooms 
    });
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// GET ALL LEAVES
export const getLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find()
      .populate('studentId', 'name')
      .populate('hostelId', 'name')
      .sort('-appliedAt');
    res.json({ success: true, leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET ALL COMPLAINTS
export const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('studentId', 'name')
      .populate('hostelId', 'name')
      .sort('-createdAt');
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE HOSTEL
export const updateHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel = await Hostel.findByIdAndUpdate(id, req.body, { new: true });
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    res.json({ success: true, message: 'Hostel updated successfully', hostel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE HOSTEL
export const deleteHostel = async (req, res) => {
  try {
    const { id } = req.params;
    const hostel = await Hostel.findById(id);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    
    const studentCount = await User.countDocuments({
      role: 'student',
      hostel: id
    });
    
    if (studentCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete hostel with ${studentCount} students` 
      });
    }
    
    await hostel.deleteOne();
    res.json({ success: true, message: 'Hostel deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==================== FEE MANAGEMENT - FIXED ====================
// GET ALL FEES (ADMIN) - FIXED WITH PROPER STUDENT NAME FETCHING
export const getAllFeesAdmin = async (req, res) => {
  try {
    const { status, month, year } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (month) query.month = month;
    if (year) query.year = parseInt(year);
    
    let fees = await Fee.find(query).sort({ year: -1, month: -1 });
    
    // Update fines in real-time
    for (let fee of fees) {
      if (typeof fee.calculateFine === 'function') {
        const newFine = fee.calculateFine();
        if (newFine !== fee.fineAmount) {
          fee.fineAmount = newFine;
          fee.totalAmount = fee.baseAmount + fee.fineAmount;
          fee.dueAmount = fee.totalAmount - fee.paidAmount;
          await fee.save();
        }
      }
    }
    
    // Get student names from Student model with populated user
    const feesWithNames = await Promise.all(fees.map(async (fee) => {
      let studentName = 'Unknown';
      let studentRegNumber = '';
      let studentEmail = '';
      
      try {
        // First find the student
        const student = await Student.findById(fee.studentId).populate('user', 'name email');
        
        if (student) {
          // Get name from populated user
          if (student.user) {
            studentName = student.user.name || 'Unknown';
            studentEmail = student.user.email || '';
          } else if (student.name) {
            // Fallback to student's own name
            studentName = student.name;
          }
          studentRegNumber = student.registrationNumber || '';
        }
      } catch (err) {
        console.log(`Error getting student name for fee ${fee._id}:`, err.message);
      }
      
      return {
        _id: fee._id,
        studentId: fee.studentId,
        studentName: studentName,
        studentEmail: studentEmail,
        registrationNumber: studentRegNumber,
        month: fee.month,
        year: fee.year,
        baseAmount: fee.baseAmount,
        fineAmount: fee.fineAmount || 0,
        discount: fee.discount || 0,
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount || 0,
        dueAmount: fee.dueAmount,
        dueDate: fee.dueDate,
        status: fee.status,
        payments: fee.payments || [],
        createdAt: fee.createdAt
      };
    }));
    
    const summary = {
      totalAmount: feesWithNames.reduce((s, f) => s + (f.totalAmount || 0), 0),
      paidAmount: feesWithNames.reduce((s, f) => s + (f.paidAmount || 0), 0),
      pendingAmount: feesWithNames.reduce((s, f) => s + (f.dueAmount || 0), 0),
      totalFine: feesWithNames.reduce((s, f) => s + (f.fineAmount || 0), 0),
      totalCount: feesWithNames.length,
      paidCount: feesWithNames.filter(f => f.status === 'paid').length,
      pendingCount: feesWithNames.filter(f => f.status === 'pending').length,
      overdueCount: feesWithNames.filter(f => f.status === 'overdue').length
    };
    
    res.json({ success: true, summary, data: feesWithNames });
  } catch (error) {
    console.error("Error in getAllFeesAdmin:", error);
    res.status(500).json({ success: false, message: error.message, data: [] });
  }
};

// GENERATE FEE
export const generateFee = async (req, res) => {
  try {
    const { studentId, month, year, rent, food, electricity, mess, dueDate, discount } = req.body;
    
    // Find student with populated user
    const student = await Student.findById(studentId).populate('user', 'name email');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Check if fee already exists
    const existingFee = await Fee.findOne({ studentId, month, year });
    if (existingFee) {
      return res.status(400).json({ success: false, message: 'Fee already exists for this month' });
    }
    
    const studentName = student.user?.name || student.name || 'Unknown';
    const studentEmail = student.user?.email || '';
    
    const subtotal = (rent || 4000) + (food || 2000) + (electricity || 500) + (mess || 3000);
    const totalAmount = subtotal - (discount || 0);
    
    const fee = new Fee({
      studentId,
      studentName: studentName,
      studentEmail: studentEmail,
      month,
      year,
      rent: rent || 4000,
      food: food || 2000,
      electricity: electricity || 500,
      mess: mess || 3000,
      subtotal,
      discount: discount || 0,
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate: dueDate || new Date(year, new Date().getMonth() + 1, 15),
      status: 'pending',
      createdBy: req.user._id
    });
    
    await fee.save();
    
    res.json({ success: true, data: fee });
  } catch (error) {
    console.error('Error generating fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GENERATE ALL FEES - FIXED
export const generateAllFees = async (req, res) => {
  try {
    const { month, year, dueDate, finePerDay = 10 } = req.body;
    
    console.log('📋 Generating fees for:', { month, year, dueDate });
    
    // Get all students with populated user data
    const students = await Student.find({}).populate('user', 'name email');
    
    if (students.length === 0) {
      return res.json({ 
        success: false, 
        message: "No students found. Please add students first.",
        results: { created: [] }
      });
    }
    
    const results = { created: [], skipped: [] };
    const due = new Date(dueDate);
    const baseAmount = 9500;
    
    for (const student of students) {
      // Check if fee already exists
      const existing = await Fee.findOne({ 
        studentId: student._id, 
        month: month, 
        year: parseInt(year) 
      });
      
      if (existing) {
        results.skipped.push(student.user?.name || student.name || student._id);
        continue;
      }
      
      // Get student name from populated user
      const studentName = student.user?.name || student.name || 'Unknown';
      const studentEmail = student.user?.email || '';
      
      // Calculate fine if due date passed
      let fineAmount = 0;
      const today = new Date();
      if (today > due) {
        const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
        fineAmount = daysLate * finePerDay;
      }
      
      const totalAmount = baseAmount + fineAmount;
      
      const fee = new Fee({
        studentId: student._id,
        studentName: studentName,
        studentEmail: studentEmail,
        month: month,
        year: parseInt(year),
        rent: 4000,
        food: 2000,
        electricity: 500,
        mess: 3000,
        baseAmount: baseAmount,
        fineAmount: fineAmount,
        totalAmount: totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        dueDate: due,
        fineType: 'per_day',
        finePerDay: finePerDay,
        status: 'pending',
        payments: [],
        createdBy: req.user._id
      });
      
      await fee.save();
      results.created.push(studentName);
      console.log(`✅ Fee created for ${studentName}`);
    }
    
    res.json({ 
      success: true, 
      results,
      message: `Generated ${results.created.length} fees, skipped ${results.skipped.length}`
    });
    
  } catch (error) {
    console.error("Error in generateAllFees:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    await Fee.findByIdAndDelete(feeId);
    res.json({ success: true, message: "Fee deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    const fee = await Fee.findByIdAndUpdate(feeId, req.body, { new: true });
    if (!fee) {
      return res.status(404).json({ success: false, message: "Fee not found" });
    }
    res.json({ success: true, data: fee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET FEE ANALYTICS
export const getFeeAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();
    
    // Monthly collection
    const monthlyCollection = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(targetYear, i, 1);
      const monthEnd = new Date(targetYear, i + 1, 0);
      
      const payments = await Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: monthStart, $lte: monthEnd },
            status: 'success'
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      monthlyCollection.push({
        month: new Date(targetYear, i).toLocaleString('default', { month: 'short' }),
        amount: payments[0]?.total || 0
      });
    }
    
    // Status distribution
    const statusDistribution = await Fee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }
    ]);
    
    // Collection by method
    const methodDistribution = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]);
    
    res.json({
      success: true,
      data: {
        monthlyCollection,
        statusDistribution,
        methodDistribution,
        totalCollected: monthlyCollection.reduce((sum, m) => sum + m.amount, 0)
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};