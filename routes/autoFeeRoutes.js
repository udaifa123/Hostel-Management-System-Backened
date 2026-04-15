import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
  setFeeStructure, 
  getFeeStructure, 
  triggerAutoGeneration 
} from '../controllers/autoFeeController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.post('/structure', setFeeStructure);
router.get('/structure', getFeeStructure);
router.post('/generate', triggerAutoGeneration);

export default router;