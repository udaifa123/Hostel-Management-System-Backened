import User from "../models/User.js";
import Student from "../models/Student.js";
import Parent from "../models/Parent.js";
import Admin from "../models/Admin.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success:false, message:"Email and password required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ success:false, message:"Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success:false, message:"Invalid email or password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    let studentData = null;
    if (user.role === "student") {
      studentData = await Student.findOne({ user: user._id }).populate("hostel").populate("room");
    }

    res.json({
      success:true,
      token,
      user: { id:user._id, name:user.name, email:user.email, role:user.role, phone:user.phone, student:studentData }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success:false, message:"Server error" });
  }
};

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, rollNumber, course, semester, batch, parentEmail } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success:false, message:"User already exists" });

    const hashedPassword = await bcrypt.hash(password,10);
    const user = await User.create({ name, email, password:hashedPassword, role, phone });

    let student = null;

    // ================= STUDENT REGISTER =================
    if (role === "student") {
      student = await Student.create({ user:user._id, phone, address, rollNumber, course, semester, batch, parentEmail, hostel:null });

      // 🔗 LINK STUDENT TO PARENT
      if (parentEmail) {
        let parentUser = await User.findOne({ email: parentEmail, role: "parent" });

      
        if (!parentUser) return console.log("❌ Parent user not found for linking");

        
        let parentProfile = await Parent.findOne({ user: parentUser._id });
        if (!parentProfile) {
          parentProfile = await Parent.create({ user: parentUser._id, phone: parentUser.phone, students: [] });
        }

        parentProfile.students.push(student._id);
        await parentProfile.save();
        console.log("✅ Student linked to parent");
      }
    }

    // ================= CREATE PARENT =================
    if (role === "parent") {
      await Parent.create({ user:user._id, phone, students:[] });
    }

    res.status(201).json({ success:true, message:"Registration successful", user:{ id:user._id, name, email, role, phone } });

  } catch (error) {
    console.error("REGISTER ERROR:",error);
    res.status(500).json({ success:false, message:error.message });
  }
};

// ================= GET ME =================
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    let studentData = null;
    let parentData = null;

    if (user.role === 'student') {
      studentData = await Student.findOne({ user: user._id }).populate("hostel").populate("room");
    }

    if (user.role === 'parent') {
      parentData = await Parent.findOne({ user: user._id })
        .populate({
          path: "students",
          populate: [
            { path: "user", select: "name email phone" },
            { path: "room" },
            { path: "hostel" }
          ]
        });
    }

    res.json({ success: true, user:{ id:user._id, name:user.name, email:user.email, role:user.role, phone:user.phone, student:studentData, parent:parentData } });

  } catch (error) {
    console.error("❌ GETME ERROR:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// ================= ADMIN LOGIN =================
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user:{ id: admin._id, name: admin.name, email: admin.email, role: "admin", phone: admin.phone } });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= STUDENT LOGIN =================
export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ email, role: "student" }).select("+password");
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const studentData = await Student.findOne({ user: user._id }).populate("hostel").populate("room");

    const token = jwt.sign({ id: user._id, role: "student" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user:{ id: user._id, name: user.name, email: user.email, role: "student", phone: user.phone, student: studentData } });

  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= WARDEN LOGIN =================
export const wardenLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await User.findOne({ email, role: "warden" }).select("+password");
    if (!user) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id, role: "warden" }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user:{ id: user._id, name: user.name, email: user.email, role: "warden", phone: user.phone } });

  } catch (error) {
    console.error("Warden login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= PARENT LOGIN =================
export const parentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("========================================");
    console.log("🔐 PARENT LOGIN ATTEMPT");
    console.log("Email:", email);
    console.log("Password received:", password ? "Yes" : "No");
    console.log("========================================");
    
    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ 
        success: false, 
        message: "Email and password required" 
      });
    }

   
    console.log("📧 Searching for parent user...");
    const user = await User.findOne({ email, role: "parent" }).select("+password");
    
    if (!user) {
      console.log("❌ Parent user NOT found for email:", email);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    console.log("✅ Parent user FOUND:", user.email);
    console.log("Stored password hash:", user.password.substring(0, 20) + "...");

    // Verify password
    console.log("🔐 Verifying password...");
    const isMatch = await bcrypt.compare(password, user.password);
    
    console.log("Password match result:", isMatch);
    
    if (!isMatch) {
      console.log("❌ Password MISMATCH for parent:", email);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    console.log("✅ Password VERIFIED for parent:", email);

    
    console.log("📝 Finding parent profile...");
    let parentData = await Parent.findOne({ user: user._id })
      .populate({
        path: "students",
        populate: [
          { path: "user", select: "name email phone" },
          { path: "room" },
          { path: "hostel" }
        ]
      });


    if (!parentData) {
      console.log("📝 Creating missing parent profile for:", email);
      parentData = await Parent.create({
        user: user._id,
        phone: user.phone || "",
        students: [],
        relation: "",
        occupation: "",
        address: "",
        isPrimary: false,
        isEmergency: false
      });
      console.log("✅ Parent profile CREATED");
    } else {
      console.log("✅ Parent profile FOUND");
    }

    
    console.log("🎫 Generating JWT token...");
    const token = jwt.sign(
      { id: user._id, role: "parent", email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    console.log("✅ PARENT LOGIN SUCCESSFUL!");
    console.log("========================================");

    res.json({ 
      success: true, 
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "parent",
        phone: user.phone,
        parent: parentData
      }
    });

  } catch (error) {
    console.error("❌ Parent login error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Server error: " + error.message 
    });
  }
};