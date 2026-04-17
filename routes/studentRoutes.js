import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";


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


import { createComplaint } from "../controllers/complaintController.js";


import { getStudentAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("student"));


router.get("/dashboard", getDashboard);


router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);


router.get("/leaves", getLeaves);
router.post("/leaves", applyLeave);


router.get("/complaints", getComplaints);
router.post("/complaints", createComplaint);


router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationRead);
router.put("/notifications/read-all", markAllNotificationsRead);

router.get("/visits", getVisits);
router.post("/visits", requestVisit);
router.delete("/visits/:id", cancelVisit);


router.get("/warden", getWardenInfo);
router.get("/chat/warden", getWardenChat);
router.post("/chat/send", sendMessage);


router.get("/fees", getFees);
router.get("/transactions", getTransactions);


router.get("/attendance", getStudentAttendance);

export default router;