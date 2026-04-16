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
  getAssetStats
} from '../controllers/assetController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Allow both admin and warden to view assets
router.get('/', authorize('admin', 'warden'), getAllAssets);
router.get('/stats', authorize('admin', 'warden'), getAssetStats);
router.get('/:id', authorize('admin', 'warden'), getAssetById);

// Admin only routes (write operations)
router.use(authorize('admin'));
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);
router.post('/assign', assignAsset);
router.put('/damaged/:id', markDamaged);

export default router;