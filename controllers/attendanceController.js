import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

// ==================== ADMIN DASHBOARD ROUTES ====================

// @desc    Get attendance statistics for dashboard
// @route   GET /api/admin/attendance/stats
// @access  Private (Admin only)
export const getAttendanceStats = async (req, res) => {
  try {
    console.log('📊 Fetching attendance statistics...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total students across all hostels
    const totalStudents = await Student.countDocuments();
    
    // Get today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    });
    
    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length;
    const lateToday = todayAttendance.filter(a => a.status === 'late').length;
    const halfDayToday = todayAttendance.filter(a => a.status === 'half-day').length;
    
    // Calculate attendance rate
    const attendanceRate = totalStudents > 0 
      ? ((presentToday / totalStudents) * 100).toFixed(1) 
      : 0;

    // Get weekly stats (last 7 days)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const weeklyAttendance = await Attendance.find({
      date: { $gte: startOfWeek, $lte: endOfWeek }
    });
    
    const weeklyPresent = weeklyAttendance.filter(a => a.status === 'present').length;
    const weeklyTotal = weeklyAttendance.length;
    const weeklyAverage = weeklyTotal > 0 
      ? ((weeklyPresent / weeklyTotal) * 100).toFixed(1) 
      : 0;

    // Get monthly stats
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const monthlyAttendance = await Attendance.find({
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const monthlyPresent = monthlyAttendance.filter(a => a.status === 'present').length;
    const monthlyTotal = monthlyAttendance.length;
    const monthlyAverage = monthlyTotal > 0 
      ? ((monthlyPresent / monthlyTotal) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      data: {
        today: {
          present: presentToday,
          absent: absentToday,
          late: lateToday,
          halfDay: halfDayToday,
          rate: attendanceRate,
          total: totalStudents
        },
        weekly: {
          average: weeklyAverage,
          total: weeklyTotal,
          present: weeklyPresent
        },
        monthly: {
          average: monthlyAverage,
          total: monthlyTotal,
          present: monthlyPresent
        }
      }
    });
  } catch (error) {
    console.error('❌ Get attendance stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get weekly attendance for charts
// @route   GET /api/admin/attendance/weekly
// @access  Private (Admin only)
export const getWeeklyAttendance = async (req, res) => {
  try {
    console.log('📊 Fetching weekly attendance data...');
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weeklyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      
      const dayAttendance = await Attendance.find({
        date: { $gte: date, $lt: nextDay }
      });
      
      const dayIndex = date.getDay();
      // Convert Sunday (0) to index 6 for display
      const displayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      
      weeklyData.push({
        date: days[displayIndex],
        present: dayAttendance.filter(a => a.status === 'present').length,
        absent: dayAttendance.filter(a => a.status === 'absent').length,
        late: dayAttendance.filter(a => a.status === 'late').length,
        halfDay: dayAttendance.filter(a => a.status === 'half-day').length
      });
    }
    
    res.json({
      success: true,
      data: weeklyData
    });
  } catch (error) {
    console.error('❌ Get weekly attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get monthly attendance for charts
// @route   GET /api/admin/attendance/monthly
// @access  Private (Admin only)
export const getMonthlyAttendance = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    console.log(`📊 Fetching monthly attendance for ${targetMonth + 1}/${targetYear}`);
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const attendance = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    const monthlyData = [];
    const daysInMonth = endDate.getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayStart = new Date(targetYear, targetMonth, i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetYear, targetMonth, i);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayAttendance = attendance.filter(a => 
        a.date >= dayStart && a.date <= dayEnd
      );
      
      monthlyData.push({
        day: i,
        present: dayAttendance.filter(a => a.status === 'present').length,
        absent: dayAttendance.filter(a => a.status === 'absent').length,
        late: dayAttendance.filter(a => a.status === 'late').length,
        halfDay: dayAttendance.filter(a => a.status === 'half-day').length
      });
    }
    
    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('❌ Get monthly attendance error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ==================== EXISTING WARDEN ROUTES ====================

// @desc    Get attendance for a specific date
// @route   GET /api/attendance/:date
// @access  Private (Warden only)
export const getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params;
    console.log(`📅 Fetching attendance for date: ${date}`);
    
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    // Get all students
    const students = await Student.find({ hostel: warden.hostel._id });

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      student: { $in: students.map(s => s._id) },
      date: { $gte: startDate, $lte: endDate }
    });

    console.log(`✅ Found ${attendanceRecords.length} attendance records`);

    const result = students.map((student) => {
      const record = attendanceRecords.find(
        (a) => a.student.toString() === student._id.toString()
      );

      return {
        student: student._id,
        status: record ? record.status : "present",
        timeIn: record?.timeIn || null,
        remarks: record?.remarks || ""
      };
    });

    res.json({
      success: true,
      count: result.length,
      data: result
    });

  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Mark attendance for multiple students
// @route   POST /api/attendance/mark
// @access  Private (Warden only)
export const markAttendance = async (req, res) => {
  try {
    const { attendance } = req.body;
    
    console.log(`📝 Marking attendance for ${attendance?.length || 0} students`);

    if (!attendance || !Array.isArray(attendance)) {
      return res.status(400).json({
        success: false,
        message: "Attendance data is required"
      });
    }

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    const results = [];
    const errors = [];

    for (const record of attendance) {
      try {
        const { studentId, status, date, timeIn, remarks } = record;

        const attendanceDate = date ? new Date(date) : new Date();
        attendanceDate.setHours(0, 0, 0, 0);

        const student = await Student.findOne({ 
          _id: studentId,
          hostel: warden.hostel._id 
        });

        if (!student) {
          errors.push({ studentId, error: "Student not found in this hostel" });
          continue;
        }

        const existingAttendance = await Attendance.findOne({
          student: studentId,
          date: attendanceDate
        });

        let attendanceRecord;

        if (existingAttendance) {
          attendanceRecord = await Attendance.findByIdAndUpdate(
            existingAttendance._id,
            {
              status,
              timeIn: timeIn || null,
              remarks: remarks || '',
              markedBy: req.user.id
            },
            { new: true }
          );
        } else {
          attendanceRecord = await Attendance.create({
            student: studentId,
            date: attendanceDate,
            status,
            timeIn: timeIn || null,
            remarks: remarks || '',
            markedBy: req.user.id
          });
        }

        results.push(attendanceRecord);
      } catch (err) {
        console.error(`❌ Error processing student ${record.studentId}:`, err);
        errors.push({ studentId: record.studentId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Attendance marked successfully. ${results.length} records processed.`,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get attendance for a specific student
// @route   GET /api/attendance/student/:studentId
// @access  Private (Warden only)
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`📊 Fetching attendance history for student: ${studentId}`);

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    const student = await Student.findOne({ 
      _id: studentId,
      hostel: warden.hostel._id 
    }).populate('user', 'name email');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found in this hostel" 
      });
    }

    const attendance = await Attendance.find({ student: studentId })
      .sort({ date: -1 })
      .limit(30)
      .populate('markedBy', 'name');

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      late: attendance.filter(a => a.status === 'late').length,
      percentage: 0
    };

    if (stats.total > 0) {
      stats.percentage = Math.round(((stats.present + stats.late) / stats.total) * 100);
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.user?.name || student.name,
          rollNumber: student.registrationNumber || student.rollNumber
        },
        stats,
        attendance
      }
    });

  } catch (error) {
    console.error('❌ Error fetching student attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Mark attendance via QR code
// @route   POST /api/attendance/qr
// @access  Private (Warden only)
export const markAttendanceByQR = async (req, res) => {
  try {
    const { qrData } = req.body;
    console.log(`📱 Marking attendance via QR: ${qrData}`);

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    const student = await Student.findOne({ 
      $or: [
        { _id: qrData },
        { registrationNumber: qrData },
        { rollNumber: qrData }
      ],
      hostel: warden.hostel._id 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      student: student._id,
      date: today
    });

    let attendance;

    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          status: 'present',
          timeIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          markedBy: req.user.id
        },
        { new: true }
      );
    } else {
      attendance = await Attendance.create({
        student: student._id,
        date: today,
        status: 'present',
        timeIn: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        markedBy: req.user.id
      });
    }

    res.json({
      success: true,
      message: "Attendance marked successfully via QR",
      data: attendance
    });

  } catch (error) {
    console.error('❌ Error marking attendance via QR:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};