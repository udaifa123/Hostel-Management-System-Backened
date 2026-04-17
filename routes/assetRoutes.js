import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getAllAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  assignAsset,
  markDamaged,
  getAssetStats,
  getAssignments,
  getAssignmentById,
  replaceAsset,
  returnAsset,
  getReplacementHistory
} from '../controllers/assetController.js';

const router = express.Router();


router.use(protect);


router.get('/', authorize('admin', 'warden'), getAllAssets);
router.get('/stats', authorize('admin', 'warden'), getAssetStats);
router.get('/assignments', authorize('admin', 'warden'), getAssignments);
router.get('/assignments/:id', authorize('admin', 'warden'), getAssignmentById);
router.get('/replacement-history', authorize('admin', 'warden'), getReplacementHistory);
router.get('/:id', authorize('admin', 'warden'), getAssetById);

router.use(authorize('admin'));
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);
router.post('/assign', assignAsset);
router.post('/replace', replaceAsset);
router.post('/return/:id', returnAsset);
router.put('/damaged/:id', markDamaged);

export default router;