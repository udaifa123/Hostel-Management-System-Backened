import mongoose from 'mongoose';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import Fine from '../models/Fine.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Parent from '../models/Parent.js';
// ==================== CALCULATION FUNCTIONS ====================

const calculateAttendancePercentage = async (studentId, month, year) => {
  try {
    const Attendance = await import('../models/Attendance.js').then(m => m.default);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendanceRecords = await Attendance.find({
      student: studentId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalDays = new Date(year, month, 0).getDate();
    const presentDays = attendanceRecords.filter(a => a.status === 'present').length;
    
    return totalDays > 0 ? (presentDays / totalDays) * 100 : 100;
  } catch (error) {
    console.error('Error calculating attendance:', error);
    return 100;
  }
};

const calculateAttendancePenalty = (attendancePercentage, baseAmount) => {
  let penalty = 0;
  let discount = 0;
  
  if (attendancePercentage >= 90) {
    discount = baseAmount * 0.05; // 5% discount for 90%+ attendance
  } else if (attendancePercentage >= 85) {
    discount = baseAmount * 0.03; // 3% discount for 85%+ attendance
  } else if (attendancePercentage >= 80) {
    discount = baseAmount * 0.01; // 1% discount for 80%+ attendance
  } else if (attendancePercentage < 75) {
    penalty = baseAmount * 0.05; // 5% penalty for <75% attendance
  } else if (attendancePercentage < 65) {
    penalty = baseAmount * 0.10; // 10% penalty for <65% attendance
  } else if (attendancePercentage < 50) {
    penalty = baseAmount * 0.20; // 20% penalty for <50% attendance
  }
  
  return { penalty, discount };
};

const calculateLateFine = (dueDate, baseAmount, paidAmount, finePerDay = 10, fineType = 'per_day', finePercentage = 2) => {
  const today = new Date();
  const due = new Date(dueDate);
  
  if (today <= due || paidAmount >= baseAmount) {
    return 0;
  }
  
  const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  
  if (fineType === 'per_day') {
    return daysLate * finePerDay;
  } else if (fineType === 'percentage') {
    return (baseAmount * finePercentage / 100) * Math.min(daysLate, 30);
  }
  return 0;
};

// ==================== ADMIN CONTROLLERS ====================
export const getAllFeesAdmin = async (req, res) => {
  try {
    const { status, month, year, studentId } = req.query;
    let query = {};
    
    if (status && status !== 'all') query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (studentId) query.studentId = studentId;
    
    // Get all active students
    const allStudents = await Student.find({ isActive: true })
      .populate('user', 'name email');
    
    // Get existing fees
    let fees = await Fee.find(query)
      .populate('studentId', 'name registrationNumber course semester')
      .sort({ year: -1, month: -1, createdAt: -1 });
    
    // Create map of existing fees
    const feeMap = new Map();
    fees.forEach(fee => {
      const studentIdStr = fee.studentId?._id?.toString() || fee.studentId?.toString();
      if (studentIdStr) {
        feeMap.set(studentIdStr, fee);
      }
    });
    
    // ✅ FIX: Calculate total amount correctly
    const transformedFees = allStudents.map(student => {
      const studentIdStr = student._id.toString();
      const existingFee = feeMap.get(studentIdStr);
      const studentName = student.name || student.user?.name || 'Unknown';
      
      if (existingFee) {
        // ✅ Calculate total amount from multiple sources
        let totalAmount = 0;
        if (existingFee.totalAmount && existingFee.totalAmount > 0) {
          totalAmount = Number(existingFee.totalAmount);
        } else if (existingFee.amount && existingFee.amount > 0) {
          totalAmount = Number(existingFee.amount);
        } else if (existingFee.baseAmount && existingFee.baseAmount > 0) {
          totalAmount = Number(existingFee.baseAmount);
        } else {
          // Calculate from components
          totalAmount = (Number(existingFee.tuitionFee) || 0) + 
                       (Number(existingFee.hostelFee) || 0) + 
                       (Number(existingFee.messFee) || 0) + 
                       (Number(existingFee.maintenanceFee) || 0);
        }
        
        const paidAmount = Number(existingFee.paidAmount) || 0;
        const dueAmount = totalAmount - paidAmount;
        
        // Calculate correct status
        let correctStatus = existingFee.status;
        if (paidAmount >= totalAmount && totalAmount > 0) {
          correctStatus = 'paid';
        } else if (paidAmount > 0 && paidAmount < totalAmount) {
          correctStatus = 'partial';
        } else if (existingFee.dueDate && new Date() > new Date(existingFee.dueDate) && dueAmount > 0) {
          correctStatus = 'overdue';
        } else {
          correctStatus = 'pending';
        }
        
        // Update database if status is wrong
        if (correctStatus !== existingFee.status && totalAmount > 0) {
          Fee.findByIdAndUpdate(existingFee._id, { 
            status: correctStatus,
            totalAmount: totalAmount,
            amount: totalAmount,
            dueAmount: dueAmount
          }).catch(err => console.error(err));
        }
        
        return {
          _id: existingFee._id,
          studentName: studentName,
          title: existingFee.title || `Monthly Fee - ${existingFee.month}/${existingFee.year}`,
          amount: totalAmount,
          paidAmount: paidAmount,
          dueAmount: dueAmount,
          dueDate: existingFee.dueDate,
          status: correctStatus,
          month: existingFee.month,
          year: existingFee.year,
          hasFee: totalAmount > 0
        };
      } else {
        // Student has NO fee record
        return {
          _id: `temp_${studentIdStr}`,
          studentName: studentName,
          title: 'Fee Not Generated',
          amount: 0,
          paidAmount: 0,
          dueAmount: 0,
          dueDate: null,
          status: 'not_generated',
          month: null,
          year: null,
          hasFee: false
        };
      }
    });
    
    // Apply filters
    let filteredFees = transformedFees;
    if (status && status !== 'all') {
      filteredFees = transformedFees.filter(f => f.status === status);
    }
    if (month) {
      filteredFees = transformedFees.filter(f => f.month === parseInt(month));
    }
    if (year) {
      filteredFees = transformedFees.filter(f => f.year === parseInt(year));
    }
    if (studentId) {
      filteredFees = transformedFees.filter(f => f.student?._id?.toString() === studentId);
    }
    
    // Calculate summary
    const validFees = filteredFees.filter(f => f.hasFee && f.amount > 0);
    const summary = {
      totalAmount: validFees.reduce((s, f) => s + (f.amount || 0), 0),
      paidAmount: validFees.reduce((s, f) => s + (f.paidAmount || 0), 0),
      pendingAmount: validFees.reduce((s, f) => s + (f.dueAmount || 0), 0),
      totalCount: filteredFees.length,
      paidCount: filteredFees.filter(f => f.status === 'paid').length,
      pendingCount: filteredFees.filter(f => f.status === 'pending').length,
      overdueCount: filteredFees.filter(f => f.status === 'overdue').length,
      partialCount: filteredFees.filter(f => f.status === 'partial').length,
      notGeneratedCount: filteredFees.filter(f => f.status === 'not_generated').length
    };
    
    console.log('📊 Admin Fees Summary:', summary);
    
    res.json({ 
      success: true, 
      summary, 
      data: filteredFees 
    });
    
  } catch (error) {
    console.error('❌ Error in getAllFeesAdmin:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message, 
      data: [],
      summary: { 
        totalAmount: 0, paidAmount: 0, pendingAmount: 0, 
        totalCount: 0, paidCount: 0, pendingCount: 0, 
        overdueCount: 0, partialCount: 0, notGeneratedCount: 0 
      }
    });
  }
};

// Generate fee for a single student
export const generateFee = async (req, res) => {
  try {
    const {
      studentId, feeType, month, year, semester,
      tuitionFee, hostelFee, messFee, maintenanceFee,
      libraryFee, sportsFee, examFee, otherFee,
      dueDate, scholarshipPercentage, finePerDay, fineType, finePercentage
    } = req.body;
    
    const student = await Student.findById(studentId).populate('user', 'name email');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    // Check if fee already exists
    const existingFee = await Fee.findOne({ studentId, month, year, feeType });
    if (existingFee) {
      return res.status(400).json({ success: false, message: 'Fee already exists for this period' });
    }
    
    const baseAmount = (tuitionFee || 0) + (hostelFee || 0) + (messFee || 0) + 
                       (maintenanceFee || 0) + (libraryFee || 0) + (sportsFee || 0) + 
                       (examFee || 0) + (otherFee || 0);
    
    // Calculate attendance penalty/discount
    const attendancePercentage = await calculateAttendancePercentage(studentId, month, year);
    const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
    
    const scholarshipAmount = scholarshipPercentage ? (baseAmount * scholarshipPercentage / 100) : 0;
    const lateFine = calculateLateFine(dueDate, baseAmount, 0, finePerDay || 10, fineType || 'per_day', finePercentage || 2);
    
    const totalAmount = baseAmount - discount - scholarshipAmount + penalty + lateFine;
    
    const fee = new Fee({
      studentId,
      studentName: student.user?.name || student.name,
      studentEmail: student.user?.email,
      registrationNumber: student.registrationNumber,
      feeType: feeType || 'monthly',
      month,
      year,
      semester,
      tuitionFee: tuitionFee || 0,
      hostelFee: hostelFee || 0,
      messFee: messFee || 0,
      maintenanceFee: maintenanceFee || 0,
      libraryFee: libraryFee || 0,
      sportsFee: sportsFee || 0,
      examFee: examFee || 0,
      otherFee: otherFee || 0,
      baseAmount,
      totalAmount,
      dueAmount: totalAmount,
      dueDate,
      attendancePercentage,
      attendanceBasedDiscount: discount,
      attendanceBasedPenalty: penalty,
      scholarshipPercentage: scholarshipPercentage || 0,
      scholarshipAmount,
      lateFine,
      finePerDay: finePerDay || 10,
      fineType: fineType || 'per_day',
      finePercentage: finePercentage || 2,
      createdBy: req.user._id,
      status: 'pending'
    });
    
    await fee.save();
    
    res.status(201).json({
      success: true,
      message: 'Fee generated successfully',
      data: fee
    });
    
  } catch (error) {
    console.error('Error generating fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate fees for all students
export const generateAllFees = async (req, res) => {
  try {
    const {
      feeType, month, year, semester,
      tuitionFee, hostelFee, messFee, maintenanceFee,
      libraryFee, sportsFee, examFee, otherFee,
      dueDate, scholarshipPercentage, finePerDay, fineType, finePercentage
    } = req.body;
    
    const students = await Student.find({ isActive: true }).populate('user', 'name email');
    
    if (students.length === 0) {
      return res.json({ success: false, message: 'No students found', results: { created: [], skipped: [] } });
    }
    
    const results = { created: [], skipped: [] };
    const baseAmount = (tuitionFee || 0) + (hostelFee || 0) + (messFee || 0) + 
                       (maintenanceFee || 0) + (libraryFee || 0) + (sportsFee || 0) + 
                       (examFee || 0) + (otherFee || 0);
    
    for (const student of students) {
      const existingFee = await Fee.findOne({ studentId: student._id, month, year, feeType });
      
      if (existingFee) {
        results.skipped.push(student.user?.name || student.name);
        continue;
      }
      
      const attendancePercentage = await calculateAttendancePercentage(student._id, month, year);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const scholarshipAmount = scholarshipPercentage ? (baseAmount * scholarshipPercentage / 100) : 0;
      const lateFine = calculateLateFine(dueDate, baseAmount, 0, finePerDay || 10, fineType || 'per_day', finePercentage || 2);
      const totalAmount = baseAmount - discount - scholarshipAmount + penalty + lateFine;
      
      const fee = new Fee({
        studentId: student._id,
        studentName: student.user?.name || student.name,
        studentEmail: student.user?.email,
        registrationNumber: student.registrationNumber,
        feeType: feeType || 'monthly',
        month,
        year,
        semester,
        tuitionFee: tuitionFee || 0,
        hostelFee: hostelFee || 0,
        messFee: messFee || 0,
        maintenanceFee: maintenanceFee || 0,
        libraryFee: libraryFee || 0,
        sportsFee: sportsFee || 0,
        examFee: examFee || 0,
        otherFee: otherFee || 0,
        baseAmount,
        totalAmount,
        dueAmount: totalAmount,
        dueDate,
        attendancePercentage,
        attendanceBasedDiscount: discount,
        attendanceBasedPenalty: penalty,
        scholarshipPercentage: scholarshipPercentage || 0,
        scholarshipAmount,
        lateFine,
        finePerDay: finePerDay || 10,
        fineType: fineType || 'per_day',
        finePercentage: finePercentage || 2,
        createdBy: req.user._id,
        status: 'pending'
      });
      
      await fee.save();
      results.created.push(student.user?.name || student.name);
    }
    
    res.json({
      success: true,
      message: `Generated ${results.created.length} fees, skipped ${results.skipped.length}`,
      results
    });
    
  } catch (error) {
    console.error('Error generating all fees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update fee
export const updateFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    const updates = req.body;
    
    const fee = await Fee.findByIdAndUpdate(feeId, updates, { new: true });
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    res.json({ success: true, data: fee });
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete fee
export const deleteFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    await Fee.findByIdAndDelete(feeId);
    res.json({ success: true, message: 'Fee deleted successfully' });
  } catch (error) {
    console.error('Error deleting fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get fee analytics
export const getFeeAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // Monthly collection
    const monthlyCollection = [];
    for (let i = 1; i <= 12; i++) {
      const fees = await Fee.find({ month: i, year: targetYear });
      monthlyCollection.push({
        month: new Date(targetYear, i - 1).toLocaleString('default', { month: 'short' }),
        total: fees.reduce((sum, f) => sum + f.totalAmount, 0),
        paid: fees.reduce((sum, f) => sum + f.paidAmount, 0),
        pending: fees.reduce((sum, f) => sum + f.dueAmount, 0),
        fine: fees.reduce((sum, f) => sum + f.totalFine, 0)
      });
    }
    
    // Status distribution
    const statusDistribution = await Fee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }
    ]);
    
    // Attendance impact
    const highAttendance = await Fee.find({ attendancePercentage: { $gte: 90 } });
    const lowAttendance = await Fee.find({ attendancePercentage: { $lt: 75 } });
    
    res.json({
      success: true,
      data: {
        monthlyCollection,
        statusDistribution,
        attendanceImpact: {
          highAttendanceCount: highAttendance.length,
          highAttendanceDiscount: highAttendance.reduce((sum, f) => sum + f.attendanceBasedDiscount, 0),
          lowAttendanceCount: lowAttendance.length,
          lowAttendancePenalty: lowAttendance.reduce((sum, f) => sum + f.attendanceBasedPenalty, 0)
        },
        totalCollected: monthlyCollection.reduce((sum, m) => sum + m.paid, 0),
        totalPending: monthlyCollection.reduce((sum, m) => sum + m.pending, 0),
        totalFine: monthlyCollection.reduce((sum, m) => sum + m.fine, 0)
      }
    });
    
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ==================== WARDEN CONTROLLERS ====================
// Get fees for warden's hostel - FIXED to show ALL students
export const getAllFeesWarden = async (req, res) => {
  try {
    console.log('🟢 Warden fees fetch started...');
    
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: 'No hostel assigned',
        summary: { totalAmount: 0, paidAmount: 0, pendingAmount: 0, totalFine: 0, totalStudents: 0 },
        data: []
      });
    }
    
    // Get ALL students in warden's hostel (not just those with fees)
    const students = await Student.find({ hostel: warden.hostel._id, isActive: true })
      .populate('user', 'name email');
    
    const studentIds = students.map(s => s._id);
    
    // Get fees for these students
    let fees = await Fee.find({ studentId: { $in: studentIds } })
      .populate('studentId', 'name registrationNumber')
      .sort({ dueDate: 1 });
    
    console.log(`Found ${fees.length} fee records for ${students.length} students`);
    
    // Create a map of existing fees
    const feeMap = new Map();
    fees.forEach(fee => {
      const studentIdStr = fee.studentId?._id?.toString() || fee.studentId?.toString();
      if (studentIdStr) {
        feeMap.set(studentIdStr, fee);
      }
    });
    
    // ✅ Combine ALL students with their fees (show ₹0 if no fee)
    const transformedFees = students.map(student => {
      const studentIdStr = student._id.toString();
      const existingFee = feeMap.get(studentIdStr);
      const studentName = student.name || student.user?.name || 'Unknown';
      
      if (existingFee) {
        // Student has fee record
        const totalAmount = Number(existingFee.totalAmount) || Number(existingFee.amount) || Number(existingFee.baseAmount) || 0;
        const paidAmount = Number(existingFee.paidAmount) || 0;
        const dueAmount = totalAmount - paidAmount;
        
        // Calculate correct status
        let correctStatus = existingFee.status;
        if (paidAmount >= totalAmount && totalAmount > 0) {
          correctStatus = 'paid';
        } else if (paidAmount > 0 && paidAmount < totalAmount) {
          correctStatus = 'partial';
        } else if (existingFee.dueDate && new Date() > new Date(existingFee.dueDate) && dueAmount > 0) {
          correctStatus = 'overdue';
        } else {
          correctStatus = 'pending';
        }
        
        return {
          _id: existingFee._id,
          studentName: studentName,
          studentId: student._id,
          title: existingFee.title || `Monthly Fee - ${existingFee.month}/${existingFee.year}`,
          amount: totalAmount,
          paidAmount: paidAmount,
          dueAmount: dueAmount,
          dueDate: existingFee.dueDate,
          status: correctStatus,
          totalFine: Number(existingFee.totalFine) || 0,
          month: existingFee.month,
          year: existingFee.year,
          hasFee: true
        };
      } else {
        // Student has NO fee record - show ₹0
        return {
          _id: `temp_${studentIdStr}`,
          studentName: studentName,
          studentId: student._id,
          title: 'Fee Not Generated',
          amount: 0,
          paidAmount: 0,
          dueAmount: 0,
          dueDate: null,
          status: 'not_generated',
          totalFine: 0,
          month: null,
          year: null,
          hasFee: false
        };
      }
    });
    
    // Calculate summary
    const validFees = transformedFees.filter(f => f.hasFee && f.amount > 0);
    const summary = {
      totalAmount: validFees.reduce((s, f) => s + (f.amount || 0), 0),
      paidAmount: validFees.reduce((s, f) => s + (f.paidAmount || 0), 0),
      pendingAmount: validFees.reduce((s, f) => s + (f.dueAmount || 0), 0),
      totalFine: validFees.reduce((s, f) => s + (f.totalFine || 0), 0),
      totalStudents: students.length,
      withFees: transformedFees.filter(f => f.hasFee).length,
      withoutFees: transformedFees.filter(f => !f.hasFee).length
    };
    
    console.log('🟢 Warden fees summary:', summary);
    
    res.json({ 
      success: true, 
      summary, 
      data: transformedFees 
    });
    
  } catch (error) {
    console.error('❌ Error in getAllFeesWarden:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      summary: {
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalFine: 0,
        totalStudents: 0,
        withFees: 0,
        withoutFees: 0
      },
      data: []
    });
  }
};

// Manual payment by warden
export const manualPayment = async (req, res) => {
  try {
    const { feeId, amount, notes } = req.body;
    
    const fee = await Fee.findById(feeId).populate('studentId');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    const paymentAmount = Number(amount) || 0;
    const dueAmount = Number(fee.dueAmount) || 0;
    
    if (paymentAmount > dueAmount) {
      return res.status(400).json({ success: false, message: 'Amount exceeds due amount' });
    }
    
    const payment = new Payment({
      studentId: fee.studentId._id,
      feeId: fee._id,
      studentName: fee.studentName,
      registrationNumber: fee.registrationNumber,
      amount: paymentAmount,
      fineAmount: fee.totalFine || 0,
      totalAmount: paymentAmount,
      paymentMethod: 'Cash',
      transactionId: `MANUAL${Date.now()}`,
      paymentDate: new Date(),
      status: 'success',
      paidBy: req.user.id,
      paidByRole: 'warden',
      notes
    });
    
    await payment.save();
    
    fee.paidAmount = (Number(fee.paidAmount) || 0) + paymentAmount;
    fee.dueAmount = (Number(fee.totalAmount) || 0) - (Number(fee.paidAmount) || 0);
    fee.payments = fee.payments || [];
    fee.payments.push({
      amount: paymentAmount,
      paymentMethod: 'Cash',
      transactionId: payment.transactionId,
      receiptNumber: payment.receiptNumber,
      paymentDate: new Date(),
      notes,
      recordedBy: req.user.id
    });
    
    if (fee.paidAmount >= (fee.totalAmount || 0)) {
      fee.status = 'paid';
      fee.paidDate = new Date();
    } else if (fee.paidAmount > 0) {
      fee.status = 'partial';
    }
    
    await fee.save();
    
    // Send notification
    if (fee.studentId.user) {
      await Notification.create({
        recipient: fee.studentId.user,
        type: 'fee',
        title: 'Payment Received',
        message: `Payment of ₹${paymentAmount} received for ${fee.feeType} fee. Receipt: ${payment.receiptNumber}`,
        data: { feeId: fee._id, paymentId: payment._id }
      });
    }
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: { fee, payment }
    });
    
  } catch (error) {
    console.error('Error in manualPayment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add manual fine by warden
export const addManualFine = async (req, res) => {
  try {
    const { feeId, fineAmount, reason } = req.body;
    
    const fee = await Fee.findById(feeId);
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    const amount = Number(fineAmount) || 0;
    
    const fine = new Fine({
      studentId: fee.studentId,
      feeId: fee._id,
      studentName: fee.studentName,
      fineType: 'manual',
      amount: amount,
      reason,
      createdBy: req.user.id,
      createdByName: req.user.name,
      status: 'pending'
    });
    
    await fine.save();
    
    fee.manualFine = (Number(fee.manualFine) || 0) + amount;
    fee.totalFine = (Number(fee.lateFine) || 0) + (Number(fee.attendanceFine) || 0) + (Number(fee.manualFine) || 0);
    fee.totalAmount = (Number(fee.baseAmount) || 0) - (Number(fee.scholarshipAmount) || 0) + (Number(fee.totalFine) || 0);
    fee.dueAmount = (Number(fee.totalAmount) || 0) - (Number(fee.paidAmount) || 0);
    await fee.save();
    
    res.json({
      success: true,
      message: `Fine of ₹${amount} added successfully`,
      data: { fee, fine }
    });
    
  } catch (error) {
    console.error('Error in addManualFine:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send fee reminder
export const sendFeeReminder = async (req, res) => {
  try {
    const { feeId } = req.params;
    
    const fee = await Fee.findById(feeId).populate('studentId');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    if (fee.studentId && fee.studentId.user) {
      await Notification.create({
        recipient: fee.studentId.user,
        type: 'fee',
        title: 'Fee Payment Reminder',
        message: `Your ${fee.feeType} fee of ₹${fee.dueAmount || 0} is due on ${fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'N/A'}. Late fine of ₹${fee.finePerDay || 10}/day will apply after due date.`,
        data: { feeId: fee._id }
      });
    }
    
    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Error in sendFeeReminder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== STUDENT CONTROLLERS ====================

// Get my fees (Student)
export const getMyFees = async (req, res) => {
  try {
    console.log('🔵 ========== GET MY FEES STARTED ==========');
    console.log('🔵 User ID:', req.user._id);
    
    const student = await Student.findOne({ user: req.user._id }).populate('user', 'name email');
    console.log('🔵 Student found:', student?._id, student?.name);
    
    if (!student) {
      console.log('❌ Student not found for user:', req.user._id);
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found',
        data: { fees: [], summary: {} }
      });
    }
    
    // ✅ FIX: Use student.name or student.user.name
    const studentName = student.name || student.user?.name || student.userName || 'Student';
    console.log('🔵 Student name:', studentName);
    
    const fees = await Fee.find({ studentId: student._id }).sort({ dueDate: 1 });
    console.log(`🔵 Found ${fees.length} fees for student ${studentName}`);
    
    if (fees.length === 0) {
      console.log('⚠️ No fees found! Please generate fees from admin panel.');
    }
    
    // ✅ Transform fees with proper student name
    const transformedFees = fees.map(fee => {
      // Calculate correct status
      const totalAmount = Number(fee.totalAmount) || Number(fee.baseAmount) || 0;
      const paidAmount = Number(fee.paidAmount) || 0;
      let correctStatus = fee.status;
      
      if (paidAmount >= totalAmount && totalAmount > 0) {
        correctStatus = 'paid';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        correctStatus = 'partial';
      } else {
        correctStatus = 'pending';
      }
      
      // Update status if needed
      if (correctStatus !== fee.status) {
        Fee.findByIdAndUpdate(fee._id, { status: correctStatus }).catch(err => console.error(err));
      }
      
      return {
        _id: fee._id,
        studentName: studentName,
        title: fee.title || `${fee.feeType || 'Monthly'} Fee - ${fee.month}/${fee.year}`,
        amount: totalAmount,
        paidAmount: paidAmount,
        dueAmount: totalAmount - paidAmount,
        dueDate: fee.dueDate,
        status: correctStatus,
        payments: fee.payments || [],
        month: fee.month,
        year: fee.year
      };
    });
    
    const summary = {
      totalAmount: transformedFees.reduce((sum, f) => sum + (f.amount || 0), 0),
      paidAmount: transformedFees.reduce((sum, f) => sum + (f.paidAmount || 0), 0),
      pendingAmount: transformedFees.reduce((sum, f) => sum + (f.dueAmount || 0), 0),
      fineAmount: transformedFees.reduce((sum, f) => sum + (f.totalFine || 0), 0),
      paidCount: transformedFees.filter(f => f.status === 'paid').length,
      pendingCount: transformedFees.filter(f => f.status !== 'paid').length,
      overdueCount: transformedFees.filter(f => f.status === 'overdue').length
    };
    
    console.log('🔵 Summary:', summary);
    console.log('🔵 ========== GET MY FEES COMPLETED ==========');
    
    res.json({ 
      success: true, 
      data: { fees: transformedFees, summary } 
    });
    
  } catch (error) {
    console.error('❌ Error in getMyFees:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      data: { fees: [], summary: {} }
    });
  }
};

// Process payment by student - DIRECT INSERT
export const processPayment = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod } = req.body;
    
    console.log('💰 Processing payment:', { feeId, amount, paymentMethod });
    
    // ✅ Validate amount is greater than 0
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }
    
    const student = await Student.findOne({ user: req.user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const fee = await Fee.findById(feeId);
    if (!fee || fee.studentId.toString() !== student._id.toString()) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    // ✅ Check due amount
    const totalAmount = Number(fee.totalAmount) || Number(fee.baseAmount) || 0;
    const currentPaid = Number(fee.paidAmount) || 0;
    const dueAmount = totalAmount - currentPaid;
    
    if (amount > dueAmount) {
      return res.status(400).json({ success: false, message: `Amount exceeds due amount of ₹${dueAmount}` });
    }
    
    let finalPaymentMethod = paymentMethod === 'UPI' ? 'UPI' : 'Online';
    
    // DIRECT MONGODB INSERT
    const db = mongoose.connection.db;
    const paymentsCollection = db.collection('payments');
    
    const paymentId = new mongoose.Types.ObjectId();
    const now = new Date();
    
    const paymentDoc = {
      _id: paymentId,
      studentId: student._id,
      feeId: fee._id,
      studentName: student.name || 'Student',
      registrationNumber: student.registrationNumber || '',
      amount: amount,
      fineAmount: 0,
      totalAmount: amount,
      paymentMethod: finalPaymentMethod,
      transactionId: `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
      receiptNumber: `RCPT${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
      paymentDate: now,
      status: 'success',
      paidBy: req.user.id,
      paidByRole: 'student',
      createdAt: now,
      updatedAt: now
    };
    
    await paymentsCollection.insertOne(paymentDoc);
    console.log('✅ Payment saved directly to MongoDB');
    
    // Update fee
    const newPaidAmount = currentPaid + amount;
    const newDueAmount = totalAmount - newPaidAmount;
    
    fee.paidAmount = newPaidAmount;
    fee.dueAmount = newDueAmount;
    fee.payments = fee.payments || [];
    fee.payments.push({
      amount: amount,
      paymentMethod: finalPaymentMethod,
      transactionId: paymentDoc.transactionId,
      receiptNumber: paymentDoc.receiptNumber,
      paymentDate: now
    });
    
    // Update status
    if (newPaidAmount >= totalAmount && totalAmount > 0) {
      fee.status = 'paid';
      fee.paidDate = now;
      console.log(`✅ Fee status updated to: paid (${newPaidAmount}/${totalAmount})`);
    } else if (newPaidAmount > 0 && newPaidAmount < totalAmount) {
      fee.status = 'partial';
      console.log(`✅ Fee status updated to: partial (${newPaidAmount}/${totalAmount})`);
    }
    
    await fee.save();
    console.log(`✅ Fee saved with status: ${fee.status}`);
    
    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        paidAmount: amount,
        receiptNumber: paymentDoc.receiptNumber,
        status: fee.status,
        dueAmount: newDueAmount
      }
    });
    
  } catch (error) {
    console.error('❌ Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PARENT CONTROLLERS ====================

// Get children fees
export const getChildrenFees = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user.id }).populate('students');
    
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const childrenData = [];
    
    for (const student of parent.students) {
      const fees = await Fee.find({ studentId: student._id }).sort({ dueDate: 1 });
      
      const summary = {
        totalAmount: fees.reduce((sum, f) => sum + f.totalAmount, 0),
        paidAmount: fees.reduce((sum, f) => sum + f.paidAmount, 0),
        pendingAmount: fees.reduce((sum, f) => sum + f.dueAmount, 0),
        fineAmount: fees.reduce((sum, f) => sum + f.totalFine, 0)
      };
      
      childrenData.push({
        child: {
          id: student._id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          course: student.course,
          semester: student.semester
        },
        fees,
        summary
      });
    }
    
    res.json({ success: true, data: childrenData });
  } catch (error) {
    console.error('Error in getChildrenFees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pay child fee
// Pay child fee - DIRECT MONGODB INSERT
export const payChildFee = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod } = req.body;
    
    console.log('💰 PayChildFee called:', { feeId, amount, paymentMethod });
    
    const parent = await Parent.findOne({ user: req.user.id });
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent not found' });
    }
    
    const fee = await Fee.findById(feeId).populate('studentId');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    const hasAccess = parent.students.some(s => s.toString() === fee.studentId._id.toString());
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    if (amount > fee.dueAmount) {
      return res.status(400).json({ success: false, message: 'Amount exceeds due amount' });
    }
    
    let finalPaymentMethod = paymentMethod === 'UPI' ? 'UPI' : 'Online';
    
    let studentName = fee.studentName || 'Student';
    if (fee.studentId && fee.studentId.name) studentName = fee.studentId.name;
    
    // DIRECT MONGODB INSERT
    const db = mongoose.connection.db;
    const paymentsCollection = db.collection('payments');
    
    const paymentData = {
      studentId: fee.studentId._id,
      feeId: fee._id,
      studentName: studentName,
      registrationNumber: fee.registrationNumber || '',
      amount: amount,
      fineAmount: 0,
      totalAmount: amount,
      paymentMethod: finalPaymentMethod,
      transactionId: `PAR${Date.now()}${Math.random().toString(36).substring(2, 10)}`,
      receiptNumber: `PRCPT${Date.now()}${Math.random().toString(36).substring(2, 10)}`,
      paymentDate: new Date(),
      status: 'success',
      paidBy: req.user.id,
      paidByRole: 'parent',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await paymentsCollection.insertOne(paymentData);
    console.log('✅ Payment saved directly to MongoDB');
    
    fee.paidAmount += amount;
    fee.dueAmount = fee.totalAmount - fee.paidAmount;
    fee.payments = fee.payments || [];
    fee.payments.push({
      amount: amount,
      paymentMethod: finalPaymentMethod,
      transactionId: paymentData.transactionId,
      receiptNumber: paymentData.receiptNumber,
      paymentDate: new Date()
    });
    
    if (fee.paidAmount >= fee.totalAmount) fee.status = 'paid';
    else if (fee.paidAmount > 0) fee.status = 'partial';
    
    await fee.save();
    
    res.json({
      success: true,
      message: 'Payment successful',
      data: { paidAmount: amount, receiptNumber: paymentData.receiptNumber }
    });
    
  } catch (error) {
    console.error('❌ Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ==================== DIRECT FEE GENERATION (WORKING) ====================

export const directGenerateFees = async (req, res) => {
  try {
    console.log('🔄 Direct fee generation started...');
    
    // Get all active students
    const students = await Student.find({ isActive: true });
    console.log(`Found ${students.length} active students`);
    
    if (students.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No active students found.' 
      });
    }
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const student of students) {
      // Check if fee already exists
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: currentMonth, 
        year: currentYear 
      });
      
      if (existingFee) {
        skippedCount++;
        continue;
      }
      
      // Default fee amounts (₹19,000 total)
      const tuitionFee = 10000;
      const hostelFee = 5000;
      const messFee = 3000;
      const maintenanceFee = 1000;
      const totalAmount = tuitionFee + hostelFee + messFee + maintenanceFee;
      
      // Create fee
      const fee = new Fee({
        studentId: student._id,
        studentName: student.name || 'Student',
        studentEmail: student.email || '',
        registrationNumber: student.registrationNumber || '',
        feeType: 'monthly',
        month: currentMonth,
        year: currentYear,
        title: `Monthly Fee - ${currentMonth}/${currentYear}`,
        tuitionFee: tuitionFee,
        hostelFee: hostelFee,
        messFee: messFee,
        maintenanceFee: maintenanceFee,
        libraryFee: 0,
        sportsFee: 0,
        examFee: 0,
        otherFee: 0,
        baseAmount: totalAmount,
        totalAmount: totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        dueDate: new Date(currentYear, currentMonth - 1, 15),
        status: 'pending',
        finePerDay: 10,
        fineType: 'per_day',
        finePercentage: 2,
        maxFine: 5000,
        scholarshipPercentage: 0,
        payments: []
      });
      
      await fee.save();
      createdCount++;
      console.log(`✅ Fee created for ${student.name}`);
    }
    
    const message = `Generated ${createdCount} fees, skipped ${skippedCount} (already exist)`;
    console.log(message);
    
    res.json({ 
      success: true, 
      message: message,
      data: { created: createdCount, skipped: skippedCount }
    });
    
  } catch (error) {
    console.error('❌ Error in direct fee generation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};


// ==================== ATTENDANCE-BASED FEE RECALCULATION ====================

// Recalculate fee based on attendance percentage
export const recalculateAttendanceFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    
    console.log(`📊 Recalculating fee ${feeId} based on attendance...`);
    
    const fee = await Fee.findById(feeId).populate('studentId');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    // Get attendance percentage (already stored or calculate)
    let attendancePercentage = fee.attendancePercentage;
    if (!attendancePercentage && fee.month && fee.year && fee.studentId) {
      attendancePercentage = await calculateAttendancePercentage(fee.studentId._id, fee.month, fee.year);
    }
    
    const baseAmount = fee.baseAmount || (fee.tuitionFee + fee.hostelFee + fee.messFee + fee.maintenanceFee);
    const { penalty, discount } = calculateAttendancePenalty(attendancePercentage || 100, baseAmount);
    
    const oldTotal = fee.totalAmount;
    const newTotal = baseAmount - discount + penalty;
    const adjustment = newTotal - oldTotal;
    
    // Update fee
    fee.totalAmount = newTotal;
    fee.dueAmount = newTotal - (fee.paidAmount || 0);
    fee.attendancePercentage = attendancePercentage || 100;
    fee.attendanceBasedDiscount = discount;
    fee.attendanceBasedPenalty = penalty;
    
    await fee.save();
    
    console.log(`✅ Fee recalculated: ${adjustment >= 0 ? '+' : ''}₹${adjustment.toLocaleString()}`);
    
    res.json({
      success: true,
      message: `Fee recalculated: ${adjustment >= 0 ? '+' : ''}₹${adjustment.toLocaleString()}`,
      data: {
        studentName: fee.studentName,
        attendancePercentage: attendancePercentage || 100,
        baseAmount,
        discount,
        penalty,
        oldTotal,
        newTotal,
        adjustment
      }
    });
    
  } catch (error) {
    console.error('Error recalculating attendance fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Recalculate ALL fees based on attendance
export const recalculateAllAttendanceFees = async (req, res) => {
  try {
    console.log('📊 Recalculating all fees based on attendance...');
    
    const { month, year } = req.query;
    let query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const fees = await Fee.find(query).populate('studentId');
    const results = [];
    
    for (const fee of fees) {
      try {
        // Get attendance percentage
        let attendancePercentage = fee.attendancePercentage;
        if ((!attendancePercentage || attendancePercentage === 100) && fee.month && fee.year && fee.studentId) {
          attendancePercentage = await calculateAttendancePercentage(fee.studentId._id, fee.month, fee.year);
        }
        
        const baseAmount = fee.baseAmount || (fee.tuitionFee + fee.hostelFee + fee.messFee + fee.maintenanceFee);
        const { penalty, discount } = calculateAttendancePenalty(attendancePercentage || 100, baseAmount);
        
        const oldTotal = fee.totalAmount;
        const newTotal = baseAmount - discount + penalty;
        
        fee.totalAmount = newTotal;
        fee.dueAmount = newTotal - (fee.paidAmount || 0);
        fee.attendancePercentage = attendancePercentage || 100;
        fee.attendanceBasedDiscount = discount;
        fee.attendanceBasedPenalty = penalty;
        
        await fee.save();
        
        results.push({
          studentName: fee.studentName,
          attendancePercentage: attendancePercentage || 100,
          oldAmount: oldTotal,
          newAmount: newTotal,
          difference: newTotal - oldTotal
        });
      } catch (err) {
        console.error(`Error processing fee ${fee._id}:`, err);
      }
    }
    
    const summary = {
      totalFees: results.length,
      totalDiscount: results.reduce((sum, r) => sum + (r.difference < 0 ? -r.difference : 0), 0),
      totalPenalty: results.reduce((sum, r) => sum + (r.difference > 0 ? r.difference : 0), 0),
      totalOldAmount: results.reduce((sum, r) => sum + r.oldAmount, 0),
      totalNewAmount: results.reduce((sum, r) => sum + r.newAmount, 0)
    };
    
    console.log(`✅ Recalculated ${results.length} fees`);
    
    res.json({
      success: true,
      message: `Recalculated ${results.length} fees`,
      summary,
      data: results
    });
    
  } catch (error) {
    console.error('Error recalculating all fees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance fee report
export const getAttendanceFeeReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const fees = await Fee.find(query).populate('studentId', 'name registrationNumber');
    
    const report = fees.map(fee => ({
      studentName: fee.studentName,
      registrationNumber: fee.registrationNumber,
      attendancePercentage: fee.attendancePercentage || 0,
      baseAmount: fee.baseAmount || (fee.tuitionFee + fee.hostelFee + fee.messFee + fee.maintenanceFee),
      discount: fee.attendanceBasedDiscount || 0,
      penalty: fee.attendanceBasedPenalty || 0,
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      dueAmount: fee.dueAmount,
      status: fee.status
    }));
    
    const summary = {
      totalBaseAmount: report.reduce((s, f) => s + f.baseAmount, 0),
      totalDiscount: report.reduce((s, f) => s + f.discount, 0),
      totalPenalty: report.reduce((s, f) => s + f.penalty, 0),
      totalAmount: report.reduce((s, f) => s + f.totalAmount, 0),
      totalPaid: report.reduce((s, f) => s + f.paidAmount, 0),
      totalDue: report.reduce((s, f) => s + f.dueAmount, 0)
    };
    
    res.json({
      success: true,
      data: report,
      summary
    });
    
  } catch (error) {
    console.error('Error getting attendance fee report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};