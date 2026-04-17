import cron from 'node-cron';
import Fee from '../models/Fee.js';
import Notification from '../models/Notification.js';
import Student from '../models/Student.js';

class FeeCronJobs {
  
  init() {
   
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Running daily fee update job...');
      
      try {
        const pendingFees = await Fee.find({ 
          status: { $in: ['pending', 'partial'] },
          isActive: true
        }).populate('studentId');
        
        let updatedCount = 0;
        
        for (const fee of pendingFees) {
          const today = new Date();
          const dueDate = new Date(fee.dueDate);
          
          if (today > dueDate && fee.paidAmount < fee.totalAmount) {
            
            const daysLate = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
            let newLateFine = 0;
            
            if (fee.fineType === 'per_day') {
              newLateFine = daysLate * (fee.finePerDay || 10);
            } else if (fee.fineType === 'percentage') {
              newLateFine = (fee.baseAmount * (fee.finePercentage || 2) / 100) * Math.min(daysLate, 30);
            }
            
            if (newLateFine !== fee.lateFine) {
              fee.lateFine = newLateFine;
              fee.totalFine = fee.lateFine + (fee.attendanceFine || 0) + (fee.manualFine || 0);
              fee.totalAmount = fee.baseAmount - fee.scholarshipAmount + fee.totalFine;
              fee.dueAmount = fee.totalAmount - fee.paidAmount;
              fee.status = 'overdue';
              await fee.save();
              updatedCount++;
              
             
              if (fee.studentId && fee.studentId.user) {
                await Notification.create({
                  recipient: fee.studentId.user,
                  type: 'fee',
                  title: 'Fee Overdue Alert',
                  message: `Your ${fee.feeType} fee of ₹${fee.dueAmount.toLocaleString()} is overdue. Late fine of ₹${fee.lateFine} has been applied.`,
                  data: { feeId: fee._id, referenceModel: 'Fee' }
                });
              }
            }
          }
        }
        
        console.log(`✅ Updated ${updatedCount} fees with late fines`);
        
      } catch (error) {
        console.error('❌ Error in fee update job:', error);
      }
    });
    
   
    cron.schedule('0 9 * * 1', async () => {
      console.log('📧 Sending fee reminder emails...');
      
      try {
        const upcomingFees = await Fee.find({
          status: { $in: ['pending', 'partial'] },
          dueDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        }).populate('studentId');
        
        let reminderCount = 0;
        
        for (const fee of upcomingFees) {
          if (fee.studentId && fee.studentId.user) {
            const daysLeft = Math.ceil((new Date(fee.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
            
            await Notification.create({
              recipient: fee.studentId.user,
              type: 'fee',
              title: 'Fee Due Reminder',
              message: `Your ${fee.feeType} fee of ₹${fee.dueAmount.toLocaleString()} is due in ${daysLeft} days (${new Date(fee.dueDate).toLocaleDateString()}). Please pay before due date to avoid late fine.`,
              data: { feeId: fee._id, referenceModel: 'Fee' }
            });
            reminderCount++;
          }
        }
        
        console.log(`✅ Sent reminders for ${reminderCount} fees`);
        
      } catch (error) {
        console.error('❌ Error sending reminders:', error);
      }
    });
    
    console.log('✅ Fee cron jobs initialized');
  }
}

export default new FeeCronJobs();