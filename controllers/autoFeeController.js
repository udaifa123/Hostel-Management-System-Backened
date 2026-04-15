import FeeStructure from '../models/FeeStructure.js';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import User from '../models/User.js';

export const setFeeStructure = async (req, res) => {
  try {
    console.log('📝 Saving fee structure:', req.body);
    
    // Delete all existing fee structures
    await FeeStructure.deleteMany({});
    
    // Create new fee structure
    const feeStructure = new FeeStructure({
      tuitionFee: req.body.tuitionFee || 10000,
      hostelFee: req.body.hostelFee || 5000,
      messFee: req.body.messFee || 3000,
      maintenanceFee: req.body.maintenanceFee || 1000,
      libraryFee: req.body.libraryFee || 500,
      sportsFee: req.body.sportsFee || 500,
      examFee: req.body.examFee || 1000,
      otherFee: req.body.otherFee || 0,
      feeType: req.body.feeType || 'monthly',
      dueDayOfMonth: req.body.dueDayOfMonth || 10,
      finePerDay: req.body.finePerDay || 10,
      fineType: req.body.fineType || 'per_day',
      finePercentage: req.body.finePercentage || 2,
      maxFine: req.body.maxFine || 5000,
      enableAttendancePenalty: req.body.enableAttendancePenalty !== false,
      attendanceThreshold: req.body.attendanceThreshold || 75,
      attendancePenaltyPercentage: req.body.attendancePenaltyPercentage || 5,
      enableDiscount: req.body.enableDiscount !== false,
      earlyPaymentDiscount: req.body.earlyPaymentDiscount || 5,
      earlyPaymentDays: req.body.earlyPaymentDays || 5,
      scholarshipPercentage: req.body.scholarshipPercentage || 0,
      autoGenerate: req.body.autoGenerate !== false,
      isActive: true,
      createdBy: req.user?._id || req.user?.id
    });
    
    await feeStructure.save();
    console.log('✅ Fee structure saved successfully');
    
    res.json({ 
      success: true, 
      message: 'Fee structure saved successfully! Click "Generate Now" to create fees.',
      data: feeStructure 
    });
    
  } catch (error) {
    console.error('❌ Error saving fee structure:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to save fee structure'
    });
  }
};

export const getFeeStructure = async (req, res) => {
  try {
    const feeStructure = await FeeStructure.findOne({ isActive: true });
    res.json({ 
      success: true, 
      data: feeStructure || null 
    });
  } catch (error) {
    console.error('Error getting fee structure:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const triggerAutoGeneration = async (req, res) => {
  try {
    console.log('🔄 Generating fees for current month...');
    
    const feeStructure = await FeeStructure.findOne({ isActive: true });
    if (!feeStructure) {
      return res.json({ 
        success: false, 
        message: 'Please configure fee structure first.' 
      });
    }
    
    const students = await Student.find({ isActive: true }).populate('user', 'name email');
    
    if (students.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No students found.' 
      });
    }
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let createdCount = 0;
    
    // Calculate fee once
    const tuitionFee = Number(feeStructure.tuitionFee) || 10000;
    const hostelFee = Number(feeStructure.hostelFee) || 5000;
    const messFee = Number(feeStructure.messFee) || 3000;
    const maintenanceFee = Number(feeStructure.maintenanceFee) || 1000;
    const totalAmount = tuitionFee + hostelFee + messFee + maintenanceFee;
    
    for (const student of students) {
      // Check if fee already exists for this month
      const existingFee = await Fee.findOne({ 
        studentId: student._id, 
        month: currentMonth, 
        year: currentYear 
      });
      
      if (!existingFee) {
        const studentName = student.user?.name || student.name || 'Student';
        
        await Fee.create({
          studentId: student._id,
          studentName: studentName,
          feeType: 'monthly',
          month: currentMonth,
          year: currentYear,
          title: `Fee - ${currentMonth}/${currentYear}`,
          amount: totalAmount,
          totalAmount: totalAmount,
          paidAmount: 0,
          dueAmount: totalAmount,
          dueDate: new Date(currentYear, currentMonth - 1, feeStructure.dueDayOfMonth || 15),
          status: 'pending',
          finePerDay: Number(feeStructure.finePerDay) || 10,
          payments: []
        });
        createdCount++;
      }
    }
    
    res.json({ 
      success: true, 
      message: `Generated ${createdCount} fees for ${currentMonth}/${currentYear}` 
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};