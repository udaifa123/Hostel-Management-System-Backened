import Fee from "../models/Fee.js";
import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import Parent from "../models/Parent.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

// ==================== HELPER FUNCTIONS ====================
const calculateFine = (dueDate, fineType = 'per_day', finePerDay = 10, fixedFine = 100, finePercentage = 5, baseAmount = 0) => {
  const today = new Date();
  const due = new Date(dueDate);
  if (today <= due) return 0;
  
  const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  
  switch(fineType) {
    case 'per_day': return daysLate * finePerDay;
    case 'fixed': return fixedFine;
    case 'percentage': return (baseAmount * finePercentage / 100);
    default: return daysLate * finePerDay;
  }
};

// ==================== STUDENT FUNCTIONS ====================
export const getMyFees = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    
    let fees = await Fee.find({ studentId: student._id }).sort({ year: -1, month: -1 });
    
    for (let fee of fees) {
      const newFine = fee.calculateFine();
      if (newFine !== fee.fineAmount) {
        fee.fineAmount = newFine;
        fee.totalAmount = fee.baseAmount + fee.fineAmount;
        fee.dueAmount = fee.totalAmount - fee.paidAmount;
        await fee.save();
      }
    }
    
    const user = await User.findById(req.user._id);
    const summary = fees.reduce((acc, f) => {
      acc.totalAmount += f.totalAmount;
      acc.paidAmount += f.paidAmount;
      acc.pendingAmount += f.dueAmount;
      acc.fineAmount += f.fineAmount;
      return acc;
    }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0, fineAmount: 0 });
    summary.paidPercentage = summary.totalAmount > 0 ? ((summary.paidAmount / summary.totalAmount) * 100).toFixed(2) : 0;
    
    res.json({ success: true, data: { fees, summary, studentName: user?.name } });
  } catch (error) {
    console.error("Get my fees error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processPayment = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod, transactionId, paymentDetails } = req.body;
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    
    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ success: false, message: "Fee not found" });
    
    const newFine = fee.calculateFine();
    if (newFine !== fee.fineAmount) {
      fee.fineAmount = newFine;
      fee.totalAmount = fee.baseAmount + fee.fineAmount;
      fee.dueAmount = fee.totalAmount - fee.paidAmount;
      await fee.save();
    }
    
    const paidAmount = amount || fee.dueAmount;
    const receiptId = `RCP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    fee.payments.push({ amount: paidAmount, transactionId, paymentMethod, receiptId, paymentDate: new Date(), status: 'success', paidBy: 'student' });
    fee.paidAmount += paidAmount;
    fee.dueAmount = fee.totalAmount - fee.paidAmount;
    if (fee.paidAmount >= fee.totalAmount) fee.status = 'paid';
    else if (fee.paidAmount > 0) fee.status = 'partial';
    await fee.save();
    
    await Payment.create({
      feeId, studentId: student._id, studentName: fee.studentName, studentEmail: fee.studentEmail,
      month: fee.month, year: fee.year, amount: paidAmount, fineAmount: fee.fineAmount,
      transactionId, receiptId, paymentMethod, paidBy: 'student', paymentDetails
    });
    
    res.json({ success: true, data: { receiptId, transactionId, paidAmount, remainingBalance: fee.dueAmount } });
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReceipt = async (req, res) => {
  try {
    const { feeId } = req.params;
    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ success: false, message: "Receipt not found" });
    
    const lastPayment = fee.payments[fee.payments.length - 1];
    res.json({
      success: true,
      data: {
        receiptId: lastPayment?.receiptId, studentName: fee.studentName,
        month: fee.month, year: fee.year, baseAmount: fee.baseAmount,
        fineAmount: fee.fineAmount, totalAmount: fee.totalAmount,
        paidAmount: lastPayment?.amount, paymentDate: lastPayment?.paymentDate,
        paymentMethod: lastPayment?.paymentMethod, transactionId: lastPayment?.transactionId,
        dueDate: fee.dueDate, remainingBalance: fee.dueAmount
      }
    });
  } catch (error) {
    console.error("Get receipt error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const { feeId } = req.params;
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    
    const fee = await Fee.findOne({ _id: feeId, studentId: student._id });
    if (!fee) return res.status(404).json({ success: false, message: "Fee not found" });
    
    res.json({ success: true, data: fee.payments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)) });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PARENT FUNCTIONS ====================
export const getChildrenFees = async (req, res) => {
  try {
    const parent = await Parent.findOne({ user: req.user._id });
    if (!parent || !parent.students?.length) return res.json({ success: true, data: [] });
    
    const childrenData = [];
    for (const studentId of parent.students) {
      const student = await Student.findById(studentId);
      if (student) {
        const user = await User.findById(student.user);
        let fees = await Fee.find({ studentId }).sort({ year: -1, month: -1 });
        
        for (let fee of fees) {
          const newFine = fee.calculateFine();
          if (newFine !== fee.fineAmount) {
            fee.fineAmount = newFine;
            fee.totalAmount = fee.baseAmount + fee.fineAmount;
            fee.dueAmount = fee.totalAmount - fee.paidAmount;
            await fee.save();
          }
        }
        
        const summary = fees.reduce((acc, f) => {
          acc.totalAmount += f.totalAmount; acc.paidAmount += f.paidAmount;
          acc.pendingAmount += f.dueAmount; acc.fineAmount += f.fineAmount;
          return acc;
        }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0, fineAmount: 0 });
        summary.paidPercentage = summary.totalAmount > 0 ? ((summary.paidAmount / summary.totalAmount) * 100).toFixed(2) : 0;
        
        childrenData.push({
          child: {
            id: student._id, name: user?.name || 'Student',
            registrationNumber: student.registrationNumber, course: student.course
          },
          fees: fees.map(f => ({
            _id: f._id, month: f.month, year: f.year, baseAmount: f.baseAmount,
            fineAmount: f.fineAmount, totalAmount: f.totalAmount,
            paidAmount: f.paidAmount, dueAmount: f.dueAmount,
            dueDate: f.dueDate, status: f.status
          })),
          summary
        });
      }
    }
    res.json({ success: true, data: childrenData });
  } catch (error) {
    console.error('Error in getChildrenFees:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const payChildFee = async (req, res) => {
  try {
    const { feeId, amount, paymentMethod, transactionId, paymentDetails } = req.body;
    const parent = await Parent.findOne({ user: req.user._id });
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });
    
    const fee = await Fee.findById(feeId).populate('studentId');
    if (!parent.students.includes(fee.studentId._id)) return res.status(403).json({ success: false, message: "Unauthorized" });
    
    const newFine = fee.calculateFine();
    if (newFine !== fee.fineAmount) {
      fee.fineAmount = newFine;
      fee.totalAmount = fee.baseAmount + fee.fineAmount;
      fee.dueAmount = fee.totalAmount - fee.paidAmount;
      await fee.save();
    }
    
    const paidAmount = amount || fee.dueAmount;
    const receiptId = `RCP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    fee.payments.push({ amount: paidAmount, transactionId, paymentMethod, receiptId, paymentDate: new Date(), status: 'success', paidBy: 'parent' });
    fee.paidAmount += paidAmount;
    fee.dueAmount = fee.totalAmount - fee.paidAmount;
    if (fee.paidAmount >= fee.totalAmount) fee.status = 'paid';
    else if (fee.paidAmount > 0) fee.status = 'partial';
    await fee.save();
    
    await Payment.create({
      feeId, studentId: fee.studentId._id, studentName: fee.studentName, studentEmail: fee.studentEmail,
      parentId: parent.user, month: fee.month, year: fee.year, amount: paidAmount, fineAmount: fee.fineAmount,
      transactionId, receiptId, paymentMethod, paidBy: 'parent', paymentDetails
    });
    
    res.json({ success: true, data: { receiptId, transactionId, paidAmount, remainingBalance: fee.dueAmount } });
  } catch (error) {
    console.error("Pay child fee error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== WARDEN FUNCTIONS ====================
export const getAllFeesWarden = async (req, res) => {
  try {
    const { status, month, year, search } = req.query;
    const warden = await User.findById(req.user._id);
    if (!warden?.hostel) return res.status(404).json({ success: false, message: "Hostel not assigned" });
    
    const students = await Student.find({ hostel: warden.hostel });
    let query = { studentId: { $in: students.map(s => s._id) } };
    if (status && status !== 'all') query.status = status;
    if (month) query.month = month;
    if (year) query.year = parseInt(year);
    
    let fees = await Fee.find(query).sort({ year: -1, month: -1 });
    
    const feesWithNames = await Promise.all(fees.map(async (fee) => {
      const student = await Student.findById(fee.studentId);
      const user = student ? await User.findById(student.user) : null;
      return { ...fee.toObject(), studentName: user?.name || 'Unknown' };
    }));
    
    for (let fee of fees) {
      const newFine = fee.calculateFine();
      if (newFine !== fee.fineAmount) {
        fee.fineAmount = newFine;
        fee.totalAmount = fee.baseAmount + fee.fineAmount;
        fee.dueAmount = fee.totalAmount - fee.paidAmount;
        await fee.save();
      }
    }
    
    const summary = {
      totalAmount: fees.reduce((s, f) => s + f.totalAmount, 0),
      paidAmount: fees.reduce((s, f) => s + f.paidAmount, 0),
      pendingAmount: fees.reduce((s, f) => s + f.dueAmount, 0),
      totalFine: fees.reduce((s, f) => s + f.fineAmount, 0),
      totalCount: fees.length, paidCount: fees.filter(f => f.status === 'paid').length,
      pendingCount: fees.filter(f => f.status === 'pending').length,
      overdueCount: fees.filter(f => f.status === 'overdue').length
    };
    
    const defaulters = fees.filter(f => f.status === 'overdue').map(f => ({
      studentId: f.studentId, amount: f.dueAmount, fineAmount: f.fineAmount,
      month: f.month, year: f.year
    }));
    
    res.json({ success: true, summary, data: feesWithNames, defaulters });
  } catch (error) {
    console.error("Get all fees warden error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const manualPayment = async (req, res) => {
  try {
    const { feeId, amount, notes } = req.body;
    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ success: false, message: "Fee not found" });
    
    const newFine = fee.calculateFine();
    if (newFine !== fee.fineAmount) {
      fee.fineAmount = newFine;
      fee.totalAmount = fee.baseAmount + fee.fineAmount;
      fee.dueAmount = fee.totalAmount - fee.paidAmount;
      await fee.save();
    }
    
    const receiptId = `CASH${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const transactionId = `MANUAL-${Date.now()}`;
    
    fee.payments.push({ amount, transactionId, paymentMethod: 'cash', receiptId, paymentDate: new Date(), status: 'success', paidBy: 'warden', notes });
    fee.paidAmount += amount;
    fee.dueAmount = fee.totalAmount - fee.paidAmount;
    if (fee.paidAmount >= fee.totalAmount) fee.status = 'paid';
    else if (fee.paidAmount > 0) fee.status = 'partial';
    await fee.save();
    
    res.json({ success: true, data: { receiptId, transactionId } });
  } catch (error) {
    console.error("Manual payment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ADMIN FUNCTIONS ====================
export const getAllFeesAdmin = async (req, res) => {
  try {
    const { status, month, year } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (month) query.month = month;
    if (year) query.year = parseInt(year);
    
    let fees = await Fee.find(query).sort({ year: -1, month: -1 });
    
    const feesWithNames = await Promise.all(fees.map(async (fee) => {
      const student = await Student.findById(fee.studentId);
      const user = student ? await User.findById(student.user) : null;
      return { ...fee.toObject(), studentName: user?.name || 'Unknown' };
    }));
    
    for (let fee of fees) {
      const newFine = fee.calculateFine();
      if (newFine !== fee.fineAmount) {
        fee.fineAmount = newFine;
        fee.totalAmount = fee.baseAmount + fee.fineAmount;
        fee.dueAmount = fee.totalAmount - fee.paidAmount;
        await fee.save();
      }
    }
    
    const summary = {
      totalAmount: fees.reduce((s, f) => s + f.totalAmount, 0),
      paidAmount: fees.reduce((s, f) => s + f.paidAmount, 0),
      pendingAmount: fees.reduce((s, f) => s + f.dueAmount, 0),
      totalFine: fees.reduce((s, f) => s + f.fineAmount, 0),
      totalCount: fees.length,
      paidCount: fees.filter(f => f.status === 'paid').length,
      pendingCount: fees.filter(f => f.status === 'pending').length,
      overdueCount: fees.filter(f => f.status === 'overdue').length
    };
    
    res.json({ success: true, summary, data: feesWithNames });
  } catch (error) {
    console.error("Get all fees admin error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateFee = async (req, res) => {
  try {
    const { studentId, month, year, rent, food, electricity, mess, dueDate, fineType, finePerDay } = req.body;
    
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    
    const user = await User.findById(student.user);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    const existingFee = await Fee.findOne({ studentId, month, year });
    if (existingFee) return res.status(400).json({ success: false, message: "Fee already exists" });
    
    const baseAmount = (rent || 4000) + (food || 2000) + (electricity || 500) + (mess || 3000);
    const totalAmount = baseAmount;
    
    const fee = new Fee({
      studentId,
      studentName: user.name,
      studentEmail: user.email,
      month, year,
      rent: rent || 4000,
      food: food || 2000,
      electricity: electricity || 500,
      mess: mess || 3000,
      baseAmount,
      totalAmount,
      paidAmount: 0,
      dueAmount: totalAmount,
      dueDate: dueDate || new Date(year, new Date().getMonth() + 1, 15),
      fineType: fineType || 'per_day',
      finePerDay: finePerDay || 10,
      status: 'pending',
      payments: [],
      createdBy: req.user._id
    });
    
    await fee.save();
    res.json({ success: true, data: fee });
  } catch (error) {
    console.error("Generate fee error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const generateAllFees = async (req, res) => {
  try {
    const { month, year, dueDate, finePerDay = 10 } = req.body;
    const students = await Student.find({}).populate('user', 'name email');
    
    if (students.length === 0) {
      return res.json({ success: false, message: "No students found", results: { created: [] } });
    }
    
    const results = { created: [], skipped: [] };
    const due = new Date(dueDate);
    const baseAmount = 9500;
    
    for (const student of students) {
      const existing = await Fee.findOne({ studentId: student._id, month, year });
      if (existing) { results.skipped.push(student.user?.name); continue; }
      
      const studentName = student.user?.name || 'Unknown';
      const studentEmail = student.user?.email || '';
      let fineAmount = 0;
      const today = new Date();
      if (today > due) {
        const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
        fineAmount = daysLate * finePerDay;
      }
      const totalAmount = baseAmount + fineAmount;
      
      const fee = new Fee({
        studentId: student._id, studentName, studentEmail,
        month, year: parseInt(year), rent: 4000, food: 2000, electricity: 500, mess: 3000,
        baseAmount, fineAmount, totalAmount, paidAmount: 0, dueAmount: totalAmount,
        dueDate: due, fineType: 'per_day', finePerDay,
        status: 'pending', payments: [], createdBy: req.user._id
      });
      
      await fee.save();
      results.created.push(studentName);
    }
    
    res.json({ success: true, results, message: `Generated ${results.created.length} fees` });
  } catch (error) {
    console.error("Generate all fees error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    await Fee.findByIdAndDelete(feeId);
    res.json({ success: true, message: "Fee deleted" });
  } catch (error) {
    console.error("Delete fee error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFee = async (req, res) => {
  try {
    const { feeId } = req.params;
    const fee = await Fee.findByIdAndUpdate(feeId, req.body, { new: true });
    if (!fee) return res.status(404).json({ success: false, message: "Fee not found" });
    res.json({ success: true, data: fee });
  } catch (error) {
    console.error("Update fee error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeAnalytics = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    const monthlyCollection = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(targetYear, i, 1);
      const monthEnd = new Date(targetYear, i + 1, 0);
      const payments = await Payment.aggregate([
        { $match: { paymentDate: { $gte: monthStart, $lte: monthEnd }, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      monthlyCollection.push({
        month: new Date(targetYear, i).toLocaleString('default', { month: 'short' }),
        amount: payments[0]?.total || 0
      });
    }
    
    const statusDistribution = await Fee.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }
    ]);
    
    const methodDistribution = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, amount: { $sum: '$amount' } } }
    ]);
    
    res.json({ success: true, data: { monthlyCollection, statusDistribution, methodDistribution, totalCollected: monthlyCollection.reduce((s, m) => s + m.amount, 0) } });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

