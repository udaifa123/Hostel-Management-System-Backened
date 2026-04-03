import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Student from '../models/Student.js';

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, attachments } = req.body;

    // Validation
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    console.log(`📤 Sending message from ${req.user.id} to ${receiverId}`);

    // Create message
    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content,
      attachments: attachments || [],
      isDelivered: true,
      isRead: false
    });

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, receiverId],
        unreadCount: new Map()
      });
      console.log('✅ New conversation created');
    }

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    
    // Increment unread count for receiver
    const currentCount = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), currentCount + 1);
    await conversation.save();

    // Populate message with sender details
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role');

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${receiverId}`).emit('new_message', populatedMessage);
      io.to(`user:${req.user.id}`).emit('message_sent', populatedMessage);
    }

    res.status(201).json({
      success: true,
      data: populatedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get conversations for current user
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`📋 Fetching conversations for user ${userId} (${userRole})`);

    let conversations = [];

    if (userRole === 'warden') {
      // Get warden's hostel
      const warden = await User.findById(userId).populate('hostel');
      
      if (!warden.hostel) {
        return res.status(404).json({
          success: false,
          message: 'No hostel assigned to this warden'
        });
      }

      // Get all students in warden's hostel
      const students = await Student.find({ hostel: warden.hostel._id })
        .populate({
          path: 'user',
          select: 'name email'
        })
        .populate('room', 'roomNumber');

      console.log(`✅ Found ${students.length} students in hostel`);

      // For each student, create a conversation object
      for (const student of students) {
        if (!student.user) continue;

        // Get last message between warden and this student
        const lastMessage = await Message.findOne({
          $or: [
            { sender: userId, receiver: student.user._id },
            { sender: student.user._id, receiver: userId }
          ]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'name')
        .populate('receiver', 'name');

        // Get unread count
        const unreadCount = await Message.countDocuments({
          sender: student.user._id,
          receiver: userId,
          isRead: false
        });

        conversations.push({
          id: student.user._id.toString(),
          participant: {
            _id: student.user._id,
            name: student.user.name || 'Unknown',
            email: student.user.email,
            role: 'student',
            room: student.room?.roomNumber || 'N/A',
            rollNumber: student.rollNumber || 'N/A'
          },
          lastMessage: lastMessage || null,
          lastMessageAt: lastMessage?.createdAt || null,
          unreadCount
        });
      }
    } else {
      // For student - find warden
      const student = await Student.findOne({ user: userId }).populate('hostel');
      
      if (student?.hostel) {
        const warden = await User.findOne({ 
          role: 'warden', 
          hostel: student.hostel._id 
        }).select('name email');

        if (warden) {
          // Get last message between student and warden
          const lastMessage = await Message.findOne({
            $or: [
              { sender: userId, receiver: warden._id },
              { sender: warden._id, receiver: userId }
            ]
          })
          .sort({ createdAt: -1 })
          .populate('sender', 'name')
          .populate('receiver', 'name');

          // Get unread count
          const unreadCount = await Message.countDocuments({
            sender: warden._id,
            receiver: userId,
            isRead: false
          });

          conversations.push({
            id: warden._id.toString(),
            participant: {
              _id: warden._id,
              name: warden.name,
              email: warden.email,
              role: 'warden'
            },
            lastMessage: lastMessage || null,
            lastMessageAt: lastMessage?.createdAt || null,
            unreadCount
          });
        }
      }
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    console.log(`✅ Returning ${conversations.length} conversations`);

    res.json({
      success: true,
      data: conversations
    });

  } catch (error) {
    console.error('❌ Error in getConversations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get messages between two users
// @route   GET /api/chat/messages/:userId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    console.log(`📥 Fetching messages between ${req.user.id} and ${userId}`);

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id }
      ],
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('sender', 'name email role')
    .populate('receiver', 'name email role')
    .populate('replyTo');

    // Mark messages as read
    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    // Update conversation unread count
    const conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId] }
    });

    if (conversation) {
      conversation.unreadCount.set(req.user.id.toString(), 0);
      await conversation.save();
    }

    // Emit read receipts
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('messages_read', {
        reader: req.user.id,
        conversationId: conversation?._id
      });
    }

    res.json({
      success: true,
      data: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/read/:userId
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    await Message.updateMany(
      {
        sender: userId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId] }
    });

    if (conversation) {
      conversation.unreadCount.set(req.user.id.toString(), 0);
      await conversation.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('messages_read', {
        reader: req.user.id,
        conversationId: conversation?._id
      });
    }

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/message/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    // Validation
    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required'
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (deleteForEveryone) {
      message.isDeleted = true;
    } else {
      message.deletedFor.push(req.user.id);
    }

    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.receiver}`).emit('message_deleted', {
        messageId,
        deleteForEveryone
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get online status of users
// @route   GET /api/chat/online-status
// @access  Private
export const getOnlineStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let users = [];
    
    if (userRole === 'warden') {
      // Get warden's hostel
      const warden = await User.findById(userId).populate('hostel');
      
      if (!warden.hostel) {
        return res.status(404).json({
          success: false,
          message: 'No hostel assigned'
        });
      }

      // Get all students in warden's hostel
      const students = await Student.find({ hostel: warden.hostel._id })
        .populate('user', 'name email')
        .populate('room', 'roomNumber');
      
      users = students.map(s => ({
        _id: s.user._id,
        name: s.user.name,
        email: s.user.email,
        role: 'student',
        room: s.room?.roomNumber,
        rollNumber: s.rollNumber
      }));
    } else {
      // For students, get warden info
      const student = await Student.findOne({ user: userId }).populate('hostel');
      if (student?.hostel) {
        const wardenUser = await User.findOne({ 
          role: 'warden',
          hostel: student.hostel._id
        }).select('name email');
        
        if (wardenUser) {
          users.push({
            _id: wardenUser._id,
            name: wardenUser.name,
            email: wardenUser.email,
            role: 'warden'
          });
        }
      }
    }

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error getting online status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get warden for student
// @route   GET /api/chat/warden
// @access  Private
export const getWarden = async (req, res) => {
  try {
    const warden = await User.findOne({ role: "warden" }).select("-password");

    if (!warden) {
      return res.status(404).json({
        success: false,
        message: "Warden not found"
      });
    }

    res.json({
      success: true,
      data: warden
    });

  } catch (error) {
    console.error("Error fetching warden:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};