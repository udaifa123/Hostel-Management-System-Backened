import express from "express";
import {
  registerAdmin,
  loginAdmin,
  createHostel,
  createWarden,
  updateWarden,     
  deleteWarden,     
  getDashboardStats,
  getHostels,
  getWardens,
  getStudents,
  getStudentById,      // Add this
  createStudent,       // Add this
  updateStudent,       // Add this
  deleteStudent,       // Add this
  getRooms,
  getLeaves,
  getComplaints,
  updateHostel,
  deleteHostel
} from "../controllers/adminController.js";

// Import FEE functions from feeController.js (NOT from adminController)
import {
  getAllFeesAdmin,
  generateFee,
  generateAllFees,
  updateFee,
  deleteFee,
  getFeeAnalytics
} from "../controllers/feeController.js";

import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// Protected routes (require admin role)
router.get("/dashboard", protect, authorize('admin'), getDashboardStats);
router.get("/hostels", protect, authorize('admin'), getHostels);
router.get("/wardens", protect, authorize('admin'), getWardens);
router.get("/students", protect, authorize('admin'), getStudents);
router.get("/rooms", protect, authorize('admin'), getRooms);
router.get("/leaves", protect, authorize('admin'), getLeaves);
router.get("/complaints", protect, authorize('admin'), getComplaints);

// CREATE routes
router.post("/create-hostel", protect, authorize('admin'), createHostel);
router.post("/create-warden", protect, authorize('admin'), createWarden);

// UPDATE and DELETE routes for hostels
router.put("/hostels/:id", protect, authorize('admin'), updateHostel);
router.delete("/hostels/:id", protect, authorize('admin'), deleteHostel);

// UPDATE and DELETE routes for wardens
router.put("/wardens/:id", protect, authorize('admin'), updateWarden);
router.delete("/wardens/:id", protect, authorize('admin'), deleteWarden);

// ==================== STUDENT MANAGEMENT ROUTES ====================
// GET single student
router.get("/students/:id", protect, authorize('admin'), getStudentById);
// CREATE student
router.post("/students", protect, authorize('admin'), createStudent);
// UPDATE student
router.put("/students/:id", protect, authorize('admin'), updateStudent);
// DELETE student
router.delete("/students/:id", protect, authorize('admin'), deleteStudent);
// ================================================================

// ==================== FEE MANAGEMENT ====================
router.get("/fees", protect, authorize('admin'), getAllFeesAdmin);
router.post("/generate-fee", protect, authorize('admin'), generateFee);
router.post("/generate-all-fees", protect, authorize('admin'), generateAllFees);
router.put("/fees/:feeId", protect, authorize('admin'), updateFee);
router.delete("/fees/:feeId", protect, authorize('admin'), deleteFee);
router.get("/analytics", protect, authorize('admin'), getFeeAnalytics);
// ========================================================

export default router;