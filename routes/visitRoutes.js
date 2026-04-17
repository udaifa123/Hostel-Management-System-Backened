import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createVisitRequest,
  getStudentVisits,
  getVisitDetails,
  getAllVisits,
  approveVisit,
  rejectVisit,
  checkInVisitor,
  checkOutVisitor,
  getVisitStatistics
} from '../controllers/visitController.js';

const router = express.Router();


router.use(protect);


router.post('/', authorize('student', 'parent'), createVisitRequest);
router.get('/my-visits', authorize('student', 'parent'), getStudentVisits);


router.get('/:id', getVisitDetails);


router.get('/', authorize('admin', 'warden'), getAllVisits);
router.put('/:id/approve', authorize('admin', 'warden'), approveVisit);
router.put('/:id/reject', authorize('admin', 'warden'), rejectVisit);
router.put('/:id/checkin', authorize('admin', 'warden', 'security'), checkInVisitor);
router.put('/:id/checkout', authorize('admin', 'warden', 'security'), checkOutVisitor);
router.get('/stats/overview', authorize('admin', 'warden'), getVisitStatistics);

export default router;