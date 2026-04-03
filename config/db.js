// const mongoose = require("mongoose");

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI);
//     console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
//   } catch (error) {
//     console.log("❌ MongoDB connection failed:", error.message);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;





import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default connectDB;