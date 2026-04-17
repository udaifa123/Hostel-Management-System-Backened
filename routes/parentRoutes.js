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


import {
  getChildrenFees,
  payChildFee
} from "../controllers/feeController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("parent"));

router.get("/dashboard", getDashboardSummary);


router.get("/student-profile", getStudentProfile);
router.put("/student-profile", updateStudentProfile);


router.get("/attendance", getAttendance);


router.get("/leaves", getLeaves);


router.get("/complaints", getComplaints);


router.get("/fees", getChildrenFees);
router.post("/pay-fee", payChildFee);

router.get("/notifications", getNotifications);
router.put("/notifications/:id/read", markNotificationRead);


router.get("/mess-menu", getMessMenu);
router.get("/mess-timings", getMessTimings);


router.get("/visits", getVisitRequests);
router.post("/visits", createVisitRequest);
router.delete("/visits/:id", cancelVisit);


router.get("/wardens", getWardens);
router.get("/chat/:wardenId", getChatHistory);
router.post("/chat/send", sendMessage);


router.get("/notices", getNotices);

export default router;