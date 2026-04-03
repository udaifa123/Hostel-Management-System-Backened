import mongoose from "mongoose";

const dashboardStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  totalStudents: Number,
  totalHostels: Number,
  totalWardens: Number,
  totalRooms: Number,
  occupiedRooms: Number,
  availableRooms: Number,
  pendingLeaves: Number,
  pendingComplaints: Number,
  totalFeesCollected: Number,
  pendingFees: Number,
  monthlyStats: {
    newStudents: Number,
    feesCollected: Number,
    complaintsResolved: Number,
    leavesApproved: Number
  }
}, {
  timestamps: true
});

const DashboardStats = mongoose.models.DashboardStats || mongoose.model("DashboardStats", dashboardStatsSchema);
export default DashboardStats;