import User from "../models/User.js";
import Student from "../models/Student.js";
import jwt from "jsonwebtoken";


export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, hostelId } = req.body;

    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required (name, email, password, role, phone)"
      });
    }

    if (!["student", "parent", "warden"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be student, parent, or warden"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `${role} with this email already exists`
      });
    }

    
    const newUser = new User({
      name,
      email: normalizedEmail,
      password,
      role,
      phone,
      hostel: hostelId || null
    });

    await newUser.save();

   
    if (role === "student") {
      try {
        const student = new Student({ user: newUser._id });
        await student.save(); 
      } catch (err) {
        await User.findByIdAndDelete(newUser._id);
        return res.status(500).json({
          success: false,
          message: "Failed to create student profile",
          error: err.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${role} registered successfully`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const isMatch = await user.comparePassword(password); // use model method

    if (!isMatch) return res.status(400).json({ success: false, message: "Wrong password" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};