import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

// ❗ REMOVE createComplaint from studentController
import {
  getDashboard,
  getStudentProfile,
  getLeaves,
  applyLeave,
  getComplaints,
  getNotifications,
  markNotificationRead,
  requestVisit,
  getVisits,
  cancelVisit,
  getWardenChat,
  sendMessage,
  getWardenInfo,
  getFees,
  getTransactions
} from "../controllers/studentController.js";

// ✅ IMPORT FROM CORRECT FILE
import { createComplaint } from "../controllers/complaintController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("student"));

// Dashboard
router.get("/dashboard", getDashboard);

// Profile
router.get("/profile", getStudentProfile);

// Leaves
router.get("/leaves", getLeaves);
router.post("/leaves", applyLeave);

// ✅ Complaints FIXED
router.get("/complaints", getComplaints);
router.post("/complaints", createComplaint);

// Notifications
router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationRead);

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

export default router;