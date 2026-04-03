import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceById,
  updateMaintenanceStatus,
  assignMaintenance,
  completeMaintenance,
  addMaintenanceNote,
  deleteMaintenance,
  getMaintenanceStats,
  getMaintenanceHistory
} from '../controllers/maintenanceController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);
router.use(authorize('warden', 'admin'));

// Main routes
router.get('/', getMaintenanceRequests);
router.get('/stats', getMaintenanceStats);
router.get('/history', getMaintenanceHistory);
router.post('/', createMaintenanceRequest);
router.get('/:id', getMaintenanceById);
router.put('/:id/status', updateMaintenanceStatus);
router.put('/:id/assign', assignMaintenance);
router.put('/:id/complete', completeMaintenance);
router.post('/:id/notes', addMaintenanceNote);
router.delete('/:id', deleteMaintenance);

export default router;