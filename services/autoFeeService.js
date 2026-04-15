import Fee from '../models/Fee.js';
import FeeStructure from '../models/FeeStructure.js';
import Student from '../models/Student.js';

class AutoFeeService {
  
  async autoGenerateAllFees() {
    try {
      console.log('🔄 Auto fee generation started...');
      
      const feeStructure = await FeeStructure.findOne({ isActive: true });
      if (!feeStructure) {
        return { success: false, message: 'No active fee structure found' };
      }
      
      const students = await Student.find({ isActive: true });
      if (students.length === 0) {
        return { success: false, message: 'No active students found' };
      }
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      let createdCount = 0;
      
      for (const student of students) {
        const existingFee = await Fee.findOne({ 
          studentId: student._id, 
          month: currentMonth, 
          year: currentYear 
        });
        
        if (!existingFee) {
          const baseAmount = feeStructure.tuitionFee + feeStructure.hostelFee + feeStructure.messFee + 
                             feeStructure.maintenanceFee + feeStructure.libraryFee + feeStructure.sportsFee + 
                             feeStructure.examFee + feeStructure.otherFee;
          
          const fee = new Fee({
            studentId: student._id,
            studentName: student.name || 'Student',
            title: `${feeStructure.feeType.charAt(0).toUpperCase() + feeStructure.feeType.slice(1)} Fee - ${currentMonth}/${currentYear}`,
            amount: baseAmount,
            totalAmount: baseAmount,
            paidAmount: 0,
            dueAmount: baseAmount,
            dueDate: new Date(currentYear, currentMonth - 1, feeStructure.dueDayOfMonth),
            status: 'pending',
            month: currentMonth,
            year: currentYear,
            feeType: feeStructure.feeType,
            payments: []
          });
          
          await fee.save();
          createdCount++;
        }
      }
      
      return { success: true, message: `Generated ${createdCount} fees` };
      
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  async autoUpdateLateFines() {
    try {
      const pendingFees = await Fee.find({ 
        status: { $in: ['pending', 'partial'] }, 
        dueDate: { $lt: new Date() } 
      });
      
      let updatedCount = 0;
      for (const fee of pendingFees) {
        const daysLate = Math.ceil((new Date() - fee.dueDate) / (1000 * 60 * 60 * 24));
        const lateFine = daysLate * (fee.finePerDay || 10);
        
        if (lateFine > 0) {
          fee.lateFine = lateFine;
          fee.totalAmount = fee.amount + lateFine;
          fee.dueAmount = fee.totalAmount - fee.paidAmount;
          fee.status = 'overdue';
          await fee.save();
          updatedCount++;
        }
      }
      
      return { success: true, updatedCount };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  async sendFeeReminders() {
    try {
      const upcomingFees = await Fee.find({
        status: { $in: ['pending', 'partial'] },
        dueDate: { 
          $gte: new Date(), 
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        }
      });
      
      return { success: true, reminderCount: upcomingFees.length };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export default new AutoFeeService();