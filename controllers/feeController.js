import mongoose from 'mongoose';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import Fine from '../models/Fine.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Parent from '../models/Parent.js';
import Attendance from '../models/Attendance.js';

// ==================== ATTENDANCE CALCULATION FUNCTIONS ====================

export const calculateAttendancePercentage = async (studentId, month, year) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const attendanceRecords = await Attendance.find({
      student: studentId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalDays = new Date(year, month, 0).getDate();
    const presentDays = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
    
    return totalDays > 0 ? (presentDays / totalDays) * 100 : 100;
  } catch (error) {
    console.error('Error calculating attendance:', error);
    return 100;
  }
};

export const calculateAttendancePenalty = (attendancePercentage, baseAmount) => {
  let penalty = 0;
  let discount = 0;
  
  if (attendancePercentage >= 90) {
    discount = baseAmount * 0.05; // 5% discount
  } else if (attendancePercentage >= 85) {
    discount = baseAmount * 0.03; // 3% discount
  } else if (attendancePercentage >= 80) {
    discount = baseAmount * 0.01; // 1% discount
  } else if (attendancePercentage < 75) {
    penalty = baseAmount * 0.05; // 5% penalty
    if (attendancePercentage < 65) {
      penalty = baseAmount * 0.10; // 10% penalty
    }
    if (attendancePercentage < 50) {
      penalty = baseAmount * 0.20; // 20% penalty
    }
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
    return Math.min(daysLate * finePerDay, 5000);
  } else if (fineType === 'percentage') {
    return Math.min((baseAmount * finePercentage / 100) * Math.min(daysLate, 30), 5000);
  }
  return 0;
};

// ==================== STUDENT CONTROLLER - MAIN ATTENDANCE FEE DISPLAY ====================

export const getMyFees = async (req, res) => {
  try {
    console.log('🔵 Fetching student fees with attendance calculation...');
    
    const student = await Student.findOne({ user: req.user._id }).populate('user', 'name email');
    
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found',
        data: { fees: [], summary: {} }
      });
    }
    
    const studentName = student.name || student.user?.name || 'Student';
    console.log(`🔵 Student: ${studentName}`);
    
    // Get all fees
    const fees = await Fee.find({ studentId: student._id }).sort({ dueDate: -1 });
    
    // Transform fees with attendance information
    const transformedFees = fees.map(fee => {
      const attendancePercentage = fee.attendancePercentage || 100;
      const discountAmount = fee.attendanceBasedDiscount || 0;
      const penaltyAmount = fee.attendanceBasedPenalty || 0;
      const totalAmount = fee.totalAmount || fee.baseAmount || 0;
      const paidAmount = fee.paidAmount || 0;
      const baseAmount = fee.baseAmount || 19000;
      
      let status = fee.status;
      if (paidAmount >= totalAmount && totalAmount > 0) {
        status = 'paid';
      } else if (fee.dueDate && new Date() > new Date(fee.dueDate) && (totalAmount - paidAmount) > 0) {
        status = 'overdue';
      } else if (paidAmount > 0 && paidAmount < totalAmount) {
        status = 'partial';
      } else {
        status = 'pending';
      }
      
      // Calculate attendance impact message
      let impactMessage = '';
      let impactColor = '';
      let impactType = '';
      
      if (attendancePercentage >= 90) {
        impactMessage = `🎉 Excellent! ${attendancePercentage}% attendance → 5% discount applied`;
        impactColor = '#10b981';
        impactType = 'discount';
      } else if (attendancePercentage >= 85) {
        impactMessage = `👍 Great! ${attendancePercentage}% attendance → 3% discount applied`;
        impactColor = '#10b981';
        impactType = 'discount';
      } else if (attendancePercentage >= 80) {
        impactMessage = `✅ Good! ${attendancePercentage}% attendance → 1% discount applied`;
        impactColor = '#10b981';
        impactType = 'discount';
      } else if (attendancePercentage >= 75) {
        impactMessage = `📊 ${attendancePercentage}% attendance → No change in fee`;
        impactColor = '#f59e0b';
        impactType = 'none';
      } else if (attendancePercentage >= 65) {
        impactMessage = `⚠️ ${attendancePercentage}% attendance → 5% penalty applied`;
        impactColor = '#ef4444';
        impactType = 'penalty';
      } else if (attendancePercentage >= 50) {
        impactMessage = `⚠️ ${attendancePercentage}% attendance → 10% penalty applied`;
        impactColor = '#ef4444';
        impactType = 'penalty';
      } else {
        impactMessage = `🔴 Critical! ${attendancePercentage}% attendance → 20% penalty applied`;
        impactColor = '#ef4444';
        impactType = 'penalty';
      }
      
      return {
        _id: fee._id,
        title: fee.title || `${fee.feeType || 'Monthly'} Fee - ${fee.month}/${fee.year}`,
        amount: totalAmount,
        paidAmount: paidAmount,
        dueAmount: totalAmount - paidAmount,
        dueDate: fee.dueDate,
        status: status,
        month: fee.month,
        year: fee.year,
        attendance: {
          percentage: attendancePercentage.toFixed(1),
          discount: discountAmount,
          penalty: penaltyAmount,
          baseAmount: baseAmount,
          finalAmount: totalAmount,
          message: impactMessage,
          color: impactColor,
          type: impactType
        },
        payments: fee.payments || []
      };
    });
    
    // Calculate current month fee (for display)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentAttendance = await calculateAttendancePercentage(student._id, currentMonth, currentYear);
    const baseAmount = 19000;
    const { penalty, discount } = calculateAttendancePenalty(currentAttendance, baseAmount);
    const currentFinalAmount = baseAmount - discount + penalty;
    
    let currentImpactMessage = '';
    let currentImpactColor = '';
    
    if (currentAttendance >= 90) {
      currentImpactMessage = `🎉 ${currentAttendance.toFixed(1)}% attendance → You get 5% discount (Save ₹${discount.toLocaleString()})`;
      currentImpactColor = '#10b981';
    } else if (currentAttendance >= 85) {
      currentImpactMessage = `👍 ${currentAttendance.toFixed(1)}% attendance → You get 3% discount (Save ₹${discount.toLocaleString()})`;
      currentImpactColor = '#10b981';
    } else if (currentAttendance >= 80) {
      currentImpactMessage = `✅ ${currentAttendance.toFixed(1)}% attendance → You get 1% discount (Save ₹${discount.toLocaleString()})`;
      currentImpactColor = '#10b981';
    } else if (currentAttendance >= 75) {
      currentImpactMessage = `📊 ${currentAttendance.toFixed(1)}% attendance → No change in fee`;
      currentImpactColor = '#f59e0b';
    } else if (currentAttendance >= 65) {
      currentImpactMessage = `⚠️ ${currentAttendance.toFixed(1)}% attendance → 5% penalty applied (Extra ₹${penalty.toLocaleString()})`;
      currentImpactColor = '#ef4444';
    } else if (currentAttendance >= 50) {
      currentImpactMessage = `⚠️ ${currentAttendance.toFixed(1)}% attendance → 10% penalty applied (Extra ₹${penalty.toLocaleString()})`;
      currentImpactColor = '#ef4444';
    } else {
      currentImpactMessage = `🔴 ${currentAttendance.toFixed(1)}% attendance → 20% penalty applied (Extra ₹${penalty.toLocaleString()})`;
      currentImpactColor = '#ef4444';
    }
    
    const summary = {
      totalAmount: transformedFees.reduce((sum, f) => sum + (f.amount || 0), 0),
      paidAmount: transformedFees.reduce((sum, f) => sum + (f.paidAmount || 0), 0),
      pendingAmount: transformedFees.reduce((sum, f) => sum + (f.dueAmount || 0), 0),
      paidCount: transformedFees.filter(f => f.status === 'paid').length,
      pendingCount: transformedFees.filter(f => f.status !== 'paid').length,
      overdueCount: transformedFees.filter(f => f.status === 'overdue').length,
      currentMonth: {
        attendancePercentage: currentAttendance.toFixed(1),
        baseAmount: baseAmount,
        discount: discount,
        penalty: penalty,
        finalAmount: currentFinalAmount,
        message: currentImpactMessage,
        color: currentImpactColor
      }
    };
    
    console.log(`✅ Returned ${transformedFees.length} fees with attendance data`);
    
    res.json({ 
      success: true, 
      data: { fees: transformedFees, summary } 
    });
  } catch (error) {
    console.error('Error in getMyFees:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      data: { fees: [], summary: {} }
    });
  }
};

// ==================== GENERATE FEES WITH ATTENDANCE ====================

export const generateAllFees = async (req, res) => {
  try {
    const { month, year, tuitionFee, hostelFee, messFee, maintenanceFee, dueDate } = req.body;
    
    const students = await Student.find({ isActive: true }).populate('user', 'name email');
    
    if (students.length === 0) {
      return res.json({ success: false, message: 'No students found' });
    }
    
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    const baseAmount = (tuitionFee || 10000) + (hostelFee || 5000) + (messFee || 3000) + (maintenanceFee || 1000);
    const dueDateObj = dueDate ? new Date(dueDate) : new Date(targetYear, targetMonth - 1, 15);
    
    const results = [];
    
    for (const student of students) {
      // Delete existing fee
      await Fee.deleteMany({ 
        studentId: student._id, 
        month: targetMonth, 
        year: targetYear 
      });
      
      // Calculate attendance for this student
      const attendancePercentage = await calculateAttendancePercentage(student._id, targetMonth, targetYear);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const finalAmount = baseAmount - discount + penalty;
      
      const fee = new Fee({
        studentId: student._id,
        studentName: student.user?.name || student.name,
        studentEmail: student.user?.email,
        registrationNumber: student.registrationNumber,
        feeType: 'monthly',
        month: targetMonth,
        year: targetYear,
        title: `Monthly Fee - ${targetMonth}/${targetYear}`,
        tuitionFee: tuitionFee || 10000,
        hostelFee: hostelFee || 5000,
        messFee: messFee || 3000,
        maintenanceFee: maintenanceFee || 1000,
        baseAmount: baseAmount,
        totalAmount: finalAmount,
        dueAmount: finalAmount,
        dueDate: dueDateObj,
        attendancePercentage: attendancePercentage,
        attendanceBasedDiscount: discount,
        attendanceBasedPenalty: penalty,
        status: 'pending',
        createdBy: req.user._id
      });
      
      await fee.save();
      
      results.push({
        studentName: student.user?.name || student.name,
        attendance: attendancePercentage.toFixed(1),
        discount: discount,
        penalty: penalty,
        finalAmount: finalAmount
      });
    }
    
    res.json({
      success: true,
      message: `Generated ${results.length} fees with attendance-based calculation`,
      results
    });
  } catch (error) {
    console.error('Error generating all fees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ADMIN CONTROLLER ====================

export const getAllFeesAdmin = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const allStudents = await Student.find({ isActive: true }).populate('user', 'name email');
    
    const results = [];
    const baseAmount = 19000;
    
    for (const student of allStudents) {
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: targetMonth, 
        year: targetYear 
      });
      
      const studentName = student.name || student.user?.name || 'Unknown';
      const rollNumber = student.registrationNumber || student.rollNumber || 'N/A';
      
      // Calculate attendance for this student
      const attendancePercentage = await calculateAttendancePercentage(student._id, targetMonth, targetYear);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const finalAmount = baseAmount - discount + penalty;
      
      if (existingFee) {
        existingFee.attendancePercentage = attendancePercentage;
        existingFee.attendanceBasedDiscount = discount;
        existingFee.attendanceBasedPenalty = penalty;
        existingFee.totalAmount = finalAmount;
        existingFee.dueAmount = finalAmount - (existingFee.paidAmount || 0);
        await existingFee.save();
        
        results.push({
          studentId: student._id,
          studentName: studentName,
          rollNumber: rollNumber,
          attendancePercentage: attendancePercentage.toFixed(1),
          baseAmount: baseAmount,
          discount: discount,
          penalty: penalty,
          finalAmount: finalAmount,
          paidAmount: existingFee.paidAmount || 0,
          dueAmount: finalAmount - (existingFee.paidAmount || 0),
          status: existingFee.status
        });
      } else {
        results.push({
          studentId: student._id,
          studentName: studentName,
          rollNumber: rollNumber,
          attendancePercentage: attendancePercentage.toFixed(1),
          baseAmount: baseAmount,
          discount: discount,
          penalty: penalty,
          finalAmount: finalAmount,
          paidAmount: 0,
          dueAmount: finalAmount,
          status: 'pending'
        });
      }
    }
    
    results.sort((a, b) => parseFloat(b.attendancePercentage) - parseFloat(a.attendancePercentage));
    
    const summary = {
      totalStudents: results.length,
      totalBaseAmount: results.reduce((sum, s) => sum + s.baseAmount, 0),
      totalDiscount: results.reduce((sum, s) => sum + s.discount, 0),
      totalPenalty: results.reduce((sum, s) => sum + s.penalty, 0),
      totalFinalAmount: results.reduce((sum, s) => sum + s.finalAmount, 0),
      totalPaid: results.reduce((sum, s) => sum + s.paidAmount, 0),
      totalDue: results.reduce((sum, s) => sum + s.dueAmount, 0),
      averageAttendance: results.reduce((sum, s) => sum + parseFloat(s.attendancePercentage), 0) / results.length
    };
    
    res.json({ success: true, summary, data: results });
  } catch (error) {
    console.error('Error in getAllFeesAdmin:', error);
    res.status(500).json({ success: false, message: error.message, data: [] });
  }
};

// ==================== WARDEN CONTROLLER ====================

export const getAllFeesWarden = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: 'No hostel assigned',
        data: []
      });
    }
    
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const students = await Student.find({ hostel: warden.hostel._id, isActive: true })
      .populate('user', 'name email');
    
    const results = [];
    const baseAmount = 19000;
    
    for (const student of students) {
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: targetMonth, 
        year: targetYear 
      });
      
      const studentName = student.name || student.user?.name || 'Unknown';
      const rollNumber = student.registrationNumber || student.rollNumber || 'N/A';
      
      const attendancePercentage = await calculateAttendancePercentage(student._id, targetMonth, targetYear);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const finalAmount = baseAmount - discount + penalty;
      
      results.push({
        studentId: student._id,
        studentName: studentName,
        rollNumber: rollNumber,
        attendancePercentage: attendancePercentage.toFixed(1),
        baseAmount: baseAmount,
        discount: discount,
        penalty: penalty,
        finalAmount: finalAmount,
        paidAmount: existingFee?.paidAmount || 0,
        dueAmount: finalAmount - (existingFee?.paidAmount || 0),
        status: existingFee?.status || 'pending'
      });
    }
    
    results.sort((a, b) => parseFloat(b.attendancePercentage) - parseFloat(a.attendancePercentage));
    
    const summary = {
      totalStudents: results.length,
      totalBaseAmount: results.reduce((sum, s) => sum + s.baseAmount, 0),
      totalDiscount: results.reduce((sum, s) => sum + s.discount, 0),
      totalPenalty: results.reduce((sum, s) => sum + s.penalty, 0),
      totalFinalAmount: results.reduce((sum, s) => sum + s.finalAmount, 0),
      totalPaid: results.reduce((sum, s) => sum + s.paidAmount, 0),
      totalDue: results.reduce((sum, s) => sum + s.dueAmount, 0),
      averageAttendance: results.reduce((sum, s) => sum + parseFloat(s.attendancePercentage), 0) / results.length
    };
    
    res.json({ success: true, summary, data: results });
  } catch (error) {
    console.error('Error in getAllFeesWarden:', error);
    res.status(500).json({ success: false, message: error.message, data: [] });
  }
};

// ==================== PARENT CONTROLLER ====================

export const getChildrenFees = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user.id }).populate('students');
    
    if (!parent || !parent.students || parent.students.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const childrenData = [];
    const baseAmount = 19000;
    
    for (const student of parent.students) {
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: targetMonth, 
        year: targetYear 
      });
      
      const attendancePercentage = await calculateAttendancePercentage(student._id, targetMonth, targetYear);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const finalAmount = baseAmount - discount + penalty;
      
      let message = '';
      if (attendancePercentage >= 90) {
        message = `🎉 ${attendancePercentage.toFixed(1)}% → 5% discount`;
      } else if (attendancePercentage >= 85) {
        message = `👍 ${attendancePercentage.toFixed(1)}% → 3% discount`;
      } else if (attendancePercentage >= 80) {
        message = `✅ ${attendancePercentage.toFixed(1)}% → 1% discount`;
      } else if (attendancePercentage >= 75) {
        message = `📊 ${attendancePercentage.toFixed(1)}% → No change`;
      } else if (attendancePercentage >= 65) {
        message = `⚠️ ${attendancePercentage.toFixed(1)}% → 5% penalty`;
      } else if (attendancePercentage >= 50) {
        message = `⚠️ ${attendancePercentage.toFixed(1)}% → 10% penalty`;
      } else {
        message = `🔴 ${attendancePercentage.toFixed(1)}% → 20% penalty`;
      }
      
      childrenData.push({
        child: {
          id: student._id,
          name: student.name,
          registrationNumber: student.registrationNumber,
          course: student.course,
          semester: student.semester
        },
        fee: {
          attendancePercentage: attendancePercentage.toFixed(1),
          baseAmount: baseAmount,
          discount: discount,
          penalty: penalty,
          finalAmount: finalAmount,
          paidAmount: existingFee?.paidAmount || 0,
          dueAmount: finalAmount - (existingFee?.paidAmount || 0),
          status: existingFee?.status || 'pending',
          message: message
        }
      });
    }
    
    const summary = {
      totalStudents: childrenData.length,
      totalBaseAmount: childrenData.reduce((sum, c) => sum + c.fee.baseAmount, 0),
      totalDiscount: childrenData.reduce((sum, c) => sum + c.fee.discount, 0),
      totalPenalty: childrenData.reduce((sum, c) => sum + c.fee.penalty, 0),
      totalFinalAmount: childrenData.reduce((sum, c) => sum + c.fee.finalAmount, 0),
      totalPaid: childrenData.reduce((sum, c) => sum + c.fee.paidAmount, 0),
      totalDue: childrenData.reduce((sum, c) => sum + c.fee.dueAmount, 0),
      averageAttendance: childrenData.reduce((sum, c) => sum + parseFloat(c.fee.attendancePercentage), 0) / childrenData.length
    };
    
    res.json({ success: true, summary, data: childrenData });
  } catch (error) {
    console.error('Error in getChildrenFees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PAYMENT FUNCTIONS ====================

export const processPayment = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod } = req.body;
    
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
    
    const totalAmount = Number(fee.totalAmount) || Number(fee.baseAmount) || 0;
    const currentPaid = Number(fee.paidAmount) || 0;
    const dueAmount = totalAmount - currentPaid;
    
    if (amount > dueAmount) {
      return res.status(400).json({ success: false, message: `Amount exceeds due amount of ₹${dueAmount}` });
    }
    
    const finalPaymentMethod = paymentMethod === 'UPI' ? 'UPI' : 'Online';
    const db = mongoose.connection.db;
    const paymentsCollection = db.collection('payments');
    
    const paymentDoc = {
      _id: new mongoose.Types.ObjectId(),
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
      paymentDate: new Date(),
      status: 'success',
      paidBy: req.user.id,
      paidByRole: 'student'
    };
    
    await paymentsCollection.insertOne(paymentDoc);
    
    fee.paidAmount = currentPaid + amount;
    fee.dueAmount = totalAmount - fee.paidAmount;
    fee.payments = fee.payments || [];
    fee.payments.push({
      amount: amount,
      paymentMethod: finalPaymentMethod,
      transactionId: paymentDoc.transactionId,
      receiptNumber: paymentDoc.receiptNumber,
      paymentDate: new Date()
    });
    
    if (fee.paidAmount >= totalAmount && totalAmount > 0) {
      fee.status = 'paid';
      fee.paidDate = new Date();
    } else if (fee.paidAmount > 0 && fee.paidAmount < totalAmount) {
      fee.status = 'partial';
    }
    
    await fee.save();
    
    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        paidAmount: amount,
        receiptNumber: paymentDoc.receiptNumber,
        status: fee.status,
        dueAmount: fee.dueAmount
      }
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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

export const payChildFee = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod } = req.body;
    
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
    
    const finalPaymentMethod = paymentMethod === 'UPI' ? 'UPI' : 'Online';
    const db = mongoose.connection.db;
    const paymentsCollection = db.collection('payments');
    
    const paymentData = {
      _id: new mongoose.Types.ObjectId(),
      studentId: fee.studentId._id,
      feeId: fee._id,
      studentName: fee.studentName,
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
      paidByRole: 'parent'
    };
    
    await paymentsCollection.insertOne(paymentData);
    
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
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== OTHER FUNCTIONS ====================

export const generateFee = async (req, res) => {
  try {
    const { studentId, month, year, tuitionFee, hostelFee, messFee, maintenanceFee, dueDate } = req.body;
    
    const student = await Student.findById(studentId).populate('user', 'name email');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const existingFee = await Fee.findOne({ studentId, month, year });
    if (existingFee) {
      return res.status(400).json({ success: false, message: 'Fee already exists' });
    }
    
    const baseAmount = (tuitionFee || 10000) + (hostelFee || 5000) + (messFee || 3000) + (maintenanceFee || 1000);
    const attendancePercentage = await calculateAttendancePercentage(studentId, month, year);
    const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
    const finalAmount = baseAmount - discount + penalty;
    
    const fee = new Fee({
      studentId,
      studentName: student.user?.name || student.name,
      studentEmail: student.user?.email,
      registrationNumber: student.registrationNumber,
      feeType: 'monthly',
      month,
      year,
      title: `Monthly Fee - ${month}/${year}`,
      tuitionFee: tuitionFee || 10000,
      hostelFee: hostelFee || 5000,
      messFee: messFee || 3000,
      maintenanceFee: maintenanceFee || 1000,
      baseAmount,
      totalAmount: finalAmount,
      dueAmount: finalAmount,
      dueDate: dueDate || new Date(year, month - 1, 15),
      attendancePercentage,
      attendanceBasedDiscount: discount,
      attendanceBasedPenalty: penalty,
      status: 'pending',
      createdBy: req.user._id
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

export const getFeeAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
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
    
    const highAttendance = await Fee.find({ attendancePercentage: { $gte: 90 } });
    const lowAttendance = await Fee.find({ attendancePercentage: { $lt: 75 } });
    
    res.json({
      success: true,
      data: {
        monthlyCollection,
        attendanceImpact: {
          highAttendanceCount: highAttendance.length,
          highAttendanceDiscount: highAttendance.reduce((sum, f) => sum + (f.attendanceBasedDiscount || 0), 0),
          lowAttendanceCount: lowAttendance.length,
          lowAttendancePenalty: lowAttendance.reduce((sum, f) => sum + (f.attendanceBasedPenalty || 0), 0)
        },
        totalCollected: monthlyCollection.reduce((sum, m) => sum + m.paid, 0),
        totalPending: monthlyCollection.reduce((sum, m) => sum + m.pending, 0)
      }
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recalculateAttendanceFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    
    const fee = await Fee.findById(feeId).populate('studentId');
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee not found' });
    }
    
    const attendancePercentage = await calculateAttendancePercentage(fee.studentId._id, fee.month, fee.year);
    const baseAmount = fee.baseAmount || (fee.tuitionFee + fee.hostelFee + fee.messFee + fee.maintenanceFee);
    const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
    
    const oldTotal = fee.totalAmount;
    const newTotal = baseAmount - discount + penalty;
    
    fee.totalAmount = newTotal;
    fee.dueAmount = newTotal - (fee.paidAmount || 0);
    fee.attendancePercentage = attendancePercentage;
    fee.attendanceBasedDiscount = discount;
    fee.attendanceBasedPenalty = penalty;
    
    await fee.save();
    
    res.json({
      success: true,
      message: `Fee recalculated based on ${attendancePercentage.toFixed(1)}% attendance`,
      data: {
        attendancePercentage: attendancePercentage.toFixed(1),
        oldAmount: oldTotal,
        newAmount: newTotal,
        discount,
        penalty
      }
    });
  } catch (error) {
    console.error('Error recalculating attendance fee:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recalculateAllAttendanceFees = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    
    const fees = await Fee.find(query).populate('studentId');
    const results = [];
    
    for (const fee of fees) {
      try {
        const attendancePercentage = await calculateAttendancePercentage(fee.studentId._id, fee.month, fee.year);
        const baseAmount = fee.baseAmount || (fee.tuitionFee + fee.hostelFee + fee.messFee + fee.maintenanceFee);
        const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
        
        const oldTotal = fee.totalAmount;
        const newTotal = baseAmount - discount + penalty;
        
        fee.totalAmount = newTotal;
        fee.dueAmount = newTotal - (fee.paidAmount || 0);
        fee.attendancePercentage = attendancePercentage;
        fee.attendanceBasedDiscount = discount;
        fee.attendanceBasedPenalty = penalty;
        
        await fee.save();
        
        results.push({
          studentName: fee.studentName,
          attendancePercentage: attendancePercentage.toFixed(1),
          oldAmount: oldTotal,
          newAmount: newTotal,
          discount,
          penalty
        });
      } catch (err) {
        console.error(`Error processing fee ${fee._id}:`, err);
      }
    }
    
    res.json({
      success: true,
      message: `Recalculated ${results.length} fees`,
      data: results
    });
  } catch (error) {
    console.error('Error recalculating all fees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceFeeReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();
    
    const students = await Student.find({ isActive: true }).populate('user', 'name email');
    const report = [];
    
    for (const student of students) {
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: targetMonth, 
        year: targetYear 
      });
      
      const attendancePercentage = await calculateAttendancePercentage(student._id, targetMonth, targetYear);
      const baseAmount = 19000;
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const finalAmount = baseAmount - discount + penalty;
      
      let status = '';
      if (existingFee) {
        if (existingFee.paidAmount >= finalAmount) status = 'paid';
        else if (existingFee.paidAmount > 0) status = 'partial';
        else status = 'pending';
      } else {
        status = 'not_generated';
      }
      
      report.push({
        studentName: student.name || student.user?.name || 'Unknown',
        registrationNumber: student.registrationNumber || 'N/A',
        attendancePercentage: attendancePercentage.toFixed(1),
        baseAmount: baseAmount,
        discount: discount,
        penalty: penalty,
        finalAmount: finalAmount,
        paidAmount: existingFee?.paidAmount || 0,
        dueAmount: finalAmount - (existingFee?.paidAmount || 0),
        status: status
      });
    }
    
    const summary = {
      totalStudents: report.length,
      totalBaseAmount: report.reduce((s, f) => s + f.baseAmount, 0),
      totalDiscount: report.reduce((s, f) => s + f.discount, 0),
      totalPenalty: report.reduce((s, f) => s + f.penalty, 0),
      totalFinalAmount: report.reduce((s, f) => s + f.finalAmount, 0),
      totalPaid: report.reduce((s, f) => s + f.paidAmount, 0),
      totalDue: report.reduce((s, f) => s + f.dueAmount, 0),
      averageAttendance: report.reduce((s, f) => s + parseFloat(f.attendancePercentage), 0) / report.length
    };
    
    res.json({ success: true, data: report, summary });
  } catch (error) {
    console.error('Error getting attendance fee report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUpdateAttendanceFees = async (req, res) => {
  try {
    const { month, year } = req.body;
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();
    
    const fees = await Fee.find({ month: currentMonth, year: currentYear }).populate('studentId');
    
    if (fees.length === 0) {
      return res.json({ 
        success: false, 
        message: `No fees found for ${currentMonth}/${currentYear}` 
      });
    }
    
    let updatedCount = 0;
    
    for (const fee of fees) {
      const attendancePercentage = await calculateAttendancePercentage(fee.studentId._id, currentMonth, currentYear);
      const baseAmount = fee.baseAmount || (fee.tuitionFee + fee.hostelFee + fee.messFee + fee.maintenanceFee);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      
      const newTotal = baseAmount - discount + penalty;
      
      if (fee.totalAmount !== newTotal) {
        fee.attendancePercentage = attendancePercentage;
        fee.attendanceBasedDiscount = discount;
        fee.attendanceBasedPenalty = penalty;
        fee.totalAmount = newTotal;
        fee.dueAmount = newTotal - (fee.paidAmount || 0);
        await fee.save();
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} fees based on attendance`
    });
  } catch (error) {
    console.error('Error in bulkUpdateAttendanceFees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const directGenerateFees = async (req, res) => {
  try {
    const students = await Student.find({ isActive: true });
    
    if (students.length === 0) {
      return res.json({ success: false, message: 'No active students found.' });
    }
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const baseAmount = 19000;
    
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const student of students) {
      const attendancePercentage = await calculateAttendancePercentage(student._id, currentMonth, currentYear);
      const { penalty, discount } = calculateAttendancePenalty(attendancePercentage, baseAmount);
      const finalAmount = baseAmount - discount + penalty;
      
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: currentMonth, 
        year: currentYear 
      });
      
      if (existingFee) {
        existingFee.attendancePercentage = attendancePercentage;
        existingFee.attendanceBasedDiscount = discount;
        existingFee.attendanceBasedPenalty = penalty;
        existingFee.totalAmount = finalAmount;
        existingFee.dueAmount = finalAmount - (existingFee.paidAmount || 0);
        await existingFee.save();
        updatedCount++;
      } else {
        const fee = new Fee({
          studentId: student._id,
          studentName: student.name || 'Student',
          studentEmail: student.email || '',
          registrationNumber: student.registrationNumber || '',
          feeType: 'monthly',
          month: currentMonth,
          year: currentYear,
          title: `Monthly Fee - ${currentMonth}/${currentYear}`,
          tuitionFee: 10000,
          hostelFee: 5000,
          messFee: 3000,
          maintenanceFee: 1000,
          baseAmount: baseAmount,
          totalAmount: finalAmount,
          paidAmount: 0,
          dueAmount: finalAmount,
          dueDate: new Date(currentYear, currentMonth - 1, 15),
          status: 'pending',
          attendancePercentage: attendancePercentage,
          attendanceBasedDiscount: discount,
          attendanceBasedPenalty: penalty,
          payments: []
        });
        await fee.save();
        createdCount++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `Created ${createdCount} new fees, updated ${updatedCount} existing fees`,
      data: { created: createdCount, updated: updatedCount }
    });
  } catch (error) {
    console.error('Error in direct fee generation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    
    fee.totalFine = (fee.totalFine || 0) + amount;
    fee.totalAmount = (fee.totalAmount || 0) + amount;
    fee.dueAmount = (fee.dueAmount || 0) + amount;
    await fee.save();
    
    res.json({
      success: true,
      message: `Fine of ₹${amount} added successfully`
    });
  } catch (error) {
    console.error('Error in addManualFine:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
        message: `Your ${fee.feeType} fee of ₹${fee.dueAmount || 0} is due on ${fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'N/A'}.`,
        data: { feeId: fee._id }
      });
    }
    
    res.json({ success: true, message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Error in sendFeeReminder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};