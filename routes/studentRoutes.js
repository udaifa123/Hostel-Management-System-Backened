// routes/studentRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

// Import all controllers
import {
  getDashboard,
  getStudentProfile,
  updateStudentProfile,
  getLeaves,
  applyLeave,
  getComplaints,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  requestVisit,
  getVisits,
  cancelVisit,
  getWardenChat,
  sendMessage,
  getWardenInfo,
  getFees,
  getTransactions
} from "../controllers/studentController.js";

// Import from complaint controller
import { createComplaint } from "../controllers/complaintController.js";

// ✅ ADD THIS IMPORT - Attendance controller
import { getStudentAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("student"));

// Dashboard
router.get("/dashboard", getDashboard);

// Profile
router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);

// Leaves
router.get("/leaves", getLeaves);
router.post("/leaves", applyLeave);

// Complaints
router.get("/complaints", getComplaints);
router.post("/complaints", createComplaint);

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationRead);
router.put("/notifications/read-all", markAllNotificationsRead);

// Visits
router.get("/visits", getVisits);
router.post("/visits", requestVisit);
router.delete("/visits/:id", cancelVisit);

// Chat
router.get("/warden", getWardenInfo);
router.get("/chat/warden", getWardenChat);
router.post("/chat/send", sendMessage);

// Fees
router.get("/fees", getFees);
router.get("/transactions", getTransactions);

// ✅ ADD THIS ROUTE - Attendance
router.get("/attendance", getStudentAttendance);

export default router;