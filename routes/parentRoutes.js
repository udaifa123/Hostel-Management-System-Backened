import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  getDashboardSummary,
  getStudentProfile,
  updateStudentProfile,
  getAttendance,
  getLeaves,
  getComplaints,
  getFees,
  getNotifications,
  markNotificationRead,
  getMessMenu,
  getMessTimings,
  createVisitRequest,
  getVisitRequests,
  cancelVisit,
  sendMessage,
  getChatHistory,
  getWardens,
  getNotices
} from "../controllers/parentController.js";

// Import FEE functions from feeController.js
import {
  getChildrenFees,
  payChildFee
} from "../controllers/feeController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("parent"));

// Dashboard
router.get("/dashboard", getDashboardSummary);

// Profile
router.get("/student-profile", getStudentProfile);
router.put("/student-profile", updateStudentProfile);

// Attendance
router.get("/attendance", getAttendance);

// Leaves
router.get("/leaves", getLeaves);

// Complaints
router.get("/complaints", getComplaints);

// ==================== FEES & PAYMENT ====================
router.get("/fees", getChildrenFees);
router.post("/pay-fee", payChildFee);
// ========================================================

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationRead);

// Mess
router.get("/mess-menu", getMessMenu);
router.get("/mess-timings", getMessTimings);

// Visit Requests
router.get("/visits", getVisitRequests);
router.post("/visits", createVisitRequest);
router.delete("/visits/:id", cancelVisit);

// Chat
router.get("/wardens", getWardens);
router.get("/chat/:wardenId", getChatHistory);
router.post("/chat/send", sendMessage);

// Notices
router.get("/notices", getNotices);

export default router;