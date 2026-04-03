import QRCode from 'qrcode';
import QRCodeModel from '../models/QRCode.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import crypto from 'crypto';

// Generate QR Code for attendance
export const generateQRCode = async (req, res) => {
  try {
    const { expiryMinutes = 30, sessionName, roomId, hostelId } = req.body;
    
    const warden = await User.findById(req.user.id);
    if (!warden) {
      return res.status(404).json({
        success: false,
        message: 'Warden not found'
      });
    }

    // Generate unique QR code data
    const qrData = {
      id: crypto.randomBytes(16).toString('hex'),
      generatedBy: req.user.id,
      hostelId: hostelId || warden.hostel,
      sessionName: sessionName || `Attendance - ${new Date().toLocaleDateString()}`,
      timestamp: new Date(),
      expiry: new Date(Date.now() + expiryMinutes * 60 * 1000)
    };

    // Create QR code record in database
    const qrRecord = await QRCodeModel.create({
      qrData: qrData.id,
      generatedBy: req.user.id,
      hostelId: qrData.hostelId,
      sessionName: qrData.sessionName,
      expiresAt: qrData.expiry,
      isActive: true,
      metadata: {
        roomId: roomId || null,
        type: 'attendance'
      }
    });

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(JSON.stringify({
      id: qrData.id,
      type: 'attendance',
      hostelId: qrData.hostelId,
      timestamp: qrData.timestamp,
      expiry: qrData.expiry
    }));

    res.json({
      success: true,
      data: {
        qrCode: qrCodeImage,
        qrId: qrRecord._id,
        qrData: qrData.id,
        expiresAt: qrData.expiry,
        sessionName: qrData.sessionName
      }
    });

  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Scan QR Code and mark attendance
export const scanQRCode = async (req, res) => {
  try {
    const { qrCode, studentId } = req.body;

    if (!qrCode || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'QR code and student ID are required'
      });
    }

    // Parse QR data
    let qrData;
    try {
      qrData = JSON.parse(qrCode);
    } catch (e) {
      // If QR is not JSON, treat as string ID
      qrData = { id: qrCode, type: 'attendance' };
    }

    // Find QR record in database
    const qrRecord = await QRCodeModel.findOne({
      qrData: qrData.id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!qrRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }

    // Get student
    const student = await Student.findById(studentId).populate('user');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student belongs to the same hostel
    if (student.hostel.toString() !== qrRecord.hostelId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Student not authorized for this QR code'
      });
    }

    // Check if attendance already marked today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      student: studentId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today'
      });
    }

    // Mark attendance
    const attendance = await Attendance.create({
      student: studentId,
      date: new Date(),
      status: 'present',
      timeIn: new Date().toLocaleTimeString(),
      markedBy: req.user.id,
      remarks: `Marked via QR: ${qrRecord.sessionName}`,
      qrCodeId: qrRecord._id
    });

    // Update QR record usage
    qrRecord.usedBy.push({
      student: studentId,
      scannedAt: new Date(),
      status: 'success'
    });
    await qrRecord.save();

    // Create notification for student
    await Notification.create({
      recipient: student.user._id,
      type: 'attendance',
      title: 'Attendance Marked',
      message: `Your attendance has been marked for ${new Date().toLocaleDateString()}`,
      data: {
        referenceId: attendance._id,
        referenceModel: 'Attendance'
      }
    });

    res.json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully'
    });

  } catch (error) {
    console.error('QR scan error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Verify QR code validity
export const verifyQRCode = async (req, res) => {
  try {
    const { qrCode } = req.params;
    
    const qrRecord = await QRCodeModel.findOne({
      qrData: qrCode,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!qrRecord) {
      return res.json({
        success: false,
        valid: false,
        message: 'Invalid or expired QR code'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        sessionName: qrRecord.sessionName,
        expiresAt: qrRecord.expiresAt,
        generatedBy: qrRecord.generatedBy
      }
    });

  } catch (error) {
    console.error('QR verify error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get QR scan history
export const getQRHistory = async (req, res) => {
  try {
    const qrCodes = await QRCodeModel.find({
      generatedBy: req.user.id
    })
    .populate('usedBy.student', 'name')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      data: qrCodes
    });

  } catch (error) {
    console.error('QR history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get attendance marked via QR
export const getAttendanceByQR = async (req, res) => {
  try {
    const attendance = await Attendance.find({
      remarks: { $regex: /Marked via QR/, $options: 'i' }
    })
    .populate('student', 'name registrationNumber')
    .sort({ date: -1 })
    .limit(100);

    res.json({
      success: true,
      data: attendance
    });

  } catch (error) {
    console.error('QR attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};