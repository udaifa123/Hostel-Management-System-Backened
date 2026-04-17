import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createComplaint,
  getStudentComplaints,
  getComplaintDetails,
  getAllComplaints,
  updateComplaintStatus,
  assignComplaint,
  addComplaintResponse,
  getComplaintStatistics
} from '../controllers/complaintController.js';

const router = express.Router();


router.use(protect);


router.post('/', authorize('student'), createComplaint);
router.get('/my-complaints', authorize('student'), getStudentComplaints);


router.get('/:id', getComplaintDetails);

router.get('/', authorize('admin', 'warden'), getAllComplaints);
router.put('/:id/status', authorize('admin', 'warden'), updateComplaintStatus);
router.put('/:id/assign', authorize('admin'), assignComplaint);
router.post('/:id/respond', authorize('admin', 'warden'), addComplaintResponse);
router.get('/stats/overview', authorize('admin', 'warden'), getComplaintStatistics);

export default router;