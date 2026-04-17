import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let account;

   
    if (decoded.role === "admin") {
      account = await Admin.findById(decoded.id).select("-password");
    } else {
      account = await User.findById(decoded.id).select("-password");
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = account;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

   
    const userRole = req.user.role || "admin";

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role ${userRole} is not authorized`,
      });
    }

    next();
  };
};