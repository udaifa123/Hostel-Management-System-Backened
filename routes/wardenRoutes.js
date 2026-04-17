import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getWardenDashboard,
  getHostelStudents,
  createStudent,
  getComplaints,
  updateComplaintStatus,
  markAttendance,
  getAttendanceReport,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getPendingVisitors,
  approveVisitor,
  rejectVisitor,
  checkinVisitor,      
  checkoutVisitor,
  getActiveVisits,
  getStudentMessages,
  sendMessageToStudent,
  getWardenProfile,
  updateWardenProfile,
  changeWardenPassword,
  getWardenSettings,
  updateWardenSettings,
  uploadWardenImage
} from '../controllers/wardenController.js';


import {
  getAllFeesWarden,
  manualPayment,
  addManualFine,
  sendFeeReminder
} from '../controllers/feeController.js';


import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomOccupants,
  removeOccupant
} from '../controllers/roomController.js';


import {
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
  pinNotice,
  getNoticeById
} from '../controllers/noticeController.js';
import upload from '../middleware/upload.js';
import User from '../models/User.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();


router.use(protect);
router.use(authorize('warden'));


router.get('/dashboard', getWardenDashboard);

router.get('/students', getHostelStudents);
router.post('/students', createStudent);

router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);
router.put('/rooms/:id/occupants', updateRoomOccupants);
router.delete('/rooms/:roomId/occupants/:studentId', removeOccupant);


router.get('/complaints', getComplaints);
router.put('/complaints/:id', updateComplaintStatus);



router.post('/notices', createNotice);
router.get('/notices', getNotices);
router.get('/notices/:id', getNoticeById);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);
router.patch('/notices/:id/pin', pinNotice);



router.post('/attendance', markAttendance);
router.get('/attendance/report', getAttendanceReport);


router.get('/leaves/pending', getPendingLeaves);
router.put('/leaves/:id/approve', approveLeave);
router.put('/leaves/:id/reject', rejectLeave);


router.get('/visitors/pending', getPendingVisitors);
router.put('/visitors/:id/approve', approveVisitor);
router.put('/visitors/:id/reject', rejectVisitor);
router.get('/visitors/active', getActiveVisits);
router.put('/visitors/:id/checkin', checkinVisitor);
router.put('/visitors/:id/checkout', checkoutVisitor);


router.get('/messages/students', getStudentMessages);
router.post('/messages/send', sendMessageToStudent);


router.get("/fees", getAllFeesWarden);
router.post("/fees/manual-payment", manualPayment);
router.post("/fees/:feeId/fine", addManualFine);
router.post("/fees/:feeId/reminder", sendFeeReminder);


router.get('/profile', getWardenProfile);
router.put('/profile', updateWardenProfile);
router.post('/change-password', changeWardenPassword);
router.get('/settings', getWardenSettings);
router.put('/settings', updateWardenSettings);
router.post('/upload-image', uploadWardenImage);


router.post('/upload-image', protect, authorize('warden'), upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    
    const warden = await User.findById(req.user.id);
    if (warden) {
      
      if (warden.profileImage) {
        const oldImagePath = path.join('.', warden.profileImage);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      warden.profileImage = imageUrl;
      await warden.save();
    }
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: { imageUrl }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;