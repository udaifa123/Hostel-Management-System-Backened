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

// Import FEE functions from feeController.js (NOT from wardenController)
import {
  getAllFeesWarden,
  manualPayment
} from '../controllers/feeController.js';

// Import room controllers
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomOccupants,
  removeOccupant
} from '../controllers/roomController.js';

// Import notice controllers
import {
  createNotice,
  getNotices,
  updateNotice,
  deleteNotice,
  pinNotice,
  getNoticeById
} from '../controllers/noticeController.js';
import upload from '../middleware/upload.js';
const router = express.Router();

// All routes require authentication and warden role
router.use(protect);
router.use(authorize('warden'));

// Dashboard
router.get('/dashboard', getWardenDashboard);

// Student Management
router.get('/students', getHostelStudents);
router.post('/students', createStudent);

// ==================== ROOM MANAGEMENT ====================
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);
router.delete('/rooms/:id', deleteRoom);
router.put('/rooms/:id/occupants', updateRoomOccupants);
router.delete('/rooms/:roomId/occupants/:studentId', removeOccupant);
// =========================================================

// ==================== COMPLAINT MANAGEMENT ====================
router.get('/complaints', getComplaints);
router.put('/complaints/:id', updateComplaintStatus);
// =============================================================

// ==================== NOTICE MANAGEMENT ====================
router.post('/notices', createNotice);
router.get('/notices', getNotices);
router.get('/notices/:id', getNoticeById);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);
router.patch('/notices/:id/pin', pinNotice);
// ============================================================

// Attendance
router.post('/attendance', markAttendance);
router.get('/attendance/report', getAttendanceReport);

// Leave Management
router.get('/leaves/pending', getPendingLeaves);
router.put('/leaves/:id/approve', approveLeave);
router.put('/leaves/:id/reject', rejectLeave);

// Visitor Management
router.get('/visitors/pending', getPendingVisitors);
router.put('/visitors/:id/approve', approveVisitor);
router.put('/visitors/:id/reject', rejectVisitor);
router.get('/visitors/active', getActiveVisits);
router.put('/visitors/:id/checkin', checkinVisitor);
router.put('/visitors/:id/checkout', checkoutVisitor);

// Chat with Students
router.get('/messages/students', getStudentMessages);
router.post('/messages/send', sendMessageToStudent);

// ==================== FEE MANAGEMENT ====================
router.get("/fees", getAllFeesWarden);
router.post("/fees/manual-payment", manualPayment);
// ========================================================


// ==================== PROFILE & SETTINGS ====================
router.get('/profile', getWardenProfile);
router.put('/profile', updateWardenProfile);
router.post('/change-password', changeWardenPassword);
router.get('/settings', getWardenSettings);
router.put('/settings', updateWardenSettings);
router.post('/upload-image', uploadWardenImage);



// Update the upload route
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
      // Delete old image if exists
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