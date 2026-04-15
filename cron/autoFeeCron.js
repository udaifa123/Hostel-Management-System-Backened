import cron from 'node-cron';
import autoFeeService from '../services/autoFeeService.js';
import FeeStructure from '../models/FeeStructure.js';

class AutoFeeCron {
  init() {
    // 1st of every month at 00:00
    cron.schedule('0 0 1 * *', async () => {
      console.log('📅 Running monthly fee generation...');
      const feeStructure = await FeeStructure.findOne({ isActive: true });
      if (feeStructure?.autoGenerate) {
        const result = await autoFeeService.autoGenerateAllFees();
        console.log(result.message);
      }
    });
    
    // Daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('💰 Updating late fines...');
      const result = await autoFeeService.autoUpdateLateFines();
      console.log(`Updated ${result.updatedCount} fees`);
    });
    
    // Every Monday at 9 AM
    cron.schedule('0 9 * * 1', async () => {
      console.log('📧 Sending fee reminders...');
      const result = await autoFeeService.sendFeeReminders();
      console.log(`Sent ${result.reminderCount} reminders`);
    });
    
    console.log('✅ Auto fee cron jobs initialized');
  }
}

export default new AutoFeeCron();