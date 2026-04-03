import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";

// Create default admin function
export const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: "admin@hostel.com" });
    
    if (!adminExists) {
      const hashed = await bcrypt.hash("admin123", 10);
      await Admin.create({
        name: "Super Admin",
        email: "admin@hostel.com",
        password: hashed
      });
      console.log("✅ Default admin created: admin@hostel.com / admin123");
    } else {
      console.log("✅ Default admin already exists");
    }
  } catch (error) {
    console.error("Error creating default admin:", error);
  }
};

// Also export as default if you want both ways
export default createDefaultAdmin;