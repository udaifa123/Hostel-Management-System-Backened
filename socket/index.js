import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export const initializeSocket = (server) => {

  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:5174"
      ],
      credentials: true,
      methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  const onlineUsers = new Map();
  const activeCalls = new Map();

  // 🔐 AUTH MIDDLEWARE
  io.use((socket, next) => {

    try {

      let token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      // remove Bearer if exists
      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userName = decoded.name;

      next();

    } catch (err) {

      console.log("❌ Invalid socket token:", err.message);
      next(new Error("Invalid token"));

    }

  });

  io.on("connection", (socket) => {

    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      role: socket.userRole
    });

    socket.join(`user:${socket.userId}`);

    socket.emit("online_users", Array.from(onlineUsers.keys()));

    socket.broadcast.emit("user_online", socket.userId);

    // ================= CHAT =================

    socket.on("join_chat", (participantId) => {

      socket.join(`chat:${participantId}`);

    });

    socket.on("leave_chat", (participantId) => {

      socket.leave(`chat:${participantId}`);

    });

    socket.on("typing", ({ receiverId, isTyping }) => {

      io.to(`user:${receiverId}`).emit("user_typing", {
        userId: socket.userId,
        isTyping
      });

    });

    socket.on("send_message", ({ receiverId, message }) => {

      io.to(`user:${receiverId}`).emit("receive_message", {
        senderId: socket.userId,
        message
      });

    });

    // ================= CALL =================

    socket.on("call:start", ({ receiverId, callType }) => {

      const receiver = onlineUsers.get(receiverId);

      if (!receiver) {
        socket.emit("call:failed", { reason: "User offline" });
        return;
      }

      const callId = `call_${Date.now()}_${socket.userId}`;

      activeCalls.set(callId, {
        callerId: socket.userId,
        receiverId,
        callType,
        status: "ringing"
      });

      io.to(`user:${receiverId}`).emit("call:incoming", {
        callId,
        callerId: socket.userId,
        callerName: socket.userName,
        callType
      });

    });

    socket.on("call:accept", ({ callId }) => {

      const call = activeCalls.get(callId);
      if (!call) return;

      call.status = "connected";

      io.to(`user:${call.callerId}`).emit("call:accepted", {
        callId
      });

    });

    socket.on("call:reject", ({ callId }) => {

      const call = activeCalls.get(callId);
      if (!call) return;

      activeCalls.delete(callId);

      io.to(`user:${call.callerId}`).emit("call:rejected", {
        callId
      });

    });

    socket.on("call:end", ({ callId }) => {

      const call = activeCalls.get(callId);
      if (!call) return;

      const other =
        call.callerId === socket.userId
          ? call.receiverId
          : call.callerId;

      io.to(`user:${other}`).emit("call:ended", { callId });

      activeCalls.delete(callId);

    });

    // ================= WEBRTC =================

    socket.on("webrtc:offer", ({ receiverId, offer }) => {

      io.to(`user:${receiverId}`).emit("webrtc:offer", {
        offer,
        senderId: socket.userId
      });

    });

    socket.on("webrtc:answer", ({ receiverId, answer }) => {

      io.to(`user:${receiverId}`).emit("webrtc:answer", {
        answer,
        senderId: socket.userId
      });

    });

    socket.on("webrtc:ice-candidate", ({ receiverId, candidate }) => {

      io.to(`user:${receiverId}`).emit("webrtc:ice-candidate", {
        candidate,
        senderId: socket.userId
      });

    });

    // ================= DISCONNECT =================

    socket.on("disconnect", (reason) => {

      console.log(`❌ User disconnected: ${socket.userId}`);

      onlineUsers.delete(socket.userId);

      io.emit("user_offline", socket.userId);

    });

  });

  return io;

};