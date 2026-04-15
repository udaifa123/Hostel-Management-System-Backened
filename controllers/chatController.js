import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Parent from '../models/Parent.js';
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


// Add these functions to your existing chatController.js

// @desc    Get wardens for parent
// @route   GET /api/chat/parent/wardens
// @access  Private (Parent only)
export const getWardensForParent = async (req, res) => {
  try {
    console.log("👥 Fetching wardens for parent...");
    console.log("User ID:", req.user.id);
    
    // Get parent with students
    const parent = await Parent.findOne({ user: req.user.id });
    
    if (!parent || !parent.students || parent.students.length === 0) {
      console.log("No students linked to parent");
      return res.json({
        success: true,
        data: [],
        message: "No students linked to your account"
      });
    }
    
    // Get students' hostel
    const student = await Student.findById(parent.students[0]).populate('hostel');
    
    if (!student || !student.hostel) {
      console.log("No hostel found for student");
      return res.json({
        success: true,
        data: [],
        message: "Hostel not assigned"
      });
    }
    
    console.log("Student hostel:", student.hostel._id);
    
    // Find warden for this hostel
    const warden = await User.findOne({ 
      role: 'warden', 
      hostel: student.hostel._id,
      isActive: true 
    }).select('name email phone _id');
    
    if (!warden) {
      console.log("No warden found for hostel");
      return res.json({
        success: true,
        data: [],
        message: "No warden assigned to this hostel"
      });
    }
    
    console.log("✅ Found warden:", warden.name);
    
    // Get last message for preview
    const lastMessage = await Message.findOne({
      $or: [
        { sender: req.user.id, receiver: warden._id },
        { sender: warden._id, receiver: req.user.id }
      ]
    }).sort({ createdAt: -1 });
    
    // Get unread count
    const unreadCount = await Message.countDocuments({
      sender: warden._id,
      receiver: req.user.id,
      isRead: false
    });
    
    const wardenData = {
      _id: warden._id,
      name: warden.name,
      email: warden.email,
      phone: warden.phone,
      role: 'warden',
      lastMessage: lastMessage?.content || null,
      lastMessageTime: lastMessage?.createdAt || null,
      unreadCount: unreadCount
    };
    
    res.json({
      success: true,
      data: [wardenData]
    });
    
  } catch (error) {
    console.error("Error fetching wardens:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chat messages for parent with warden
// @route   GET /api/chat/parent/chat/:wardenId
// @access  Private (Parent only)
export const getParentChatMessages = async (req, res) => {
  try {
    const { wardenId } = req.params;
    
    console.log(`💬 Fetching chat messages with warden: ${wardenId}`);
    
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: wardenId },
        { sender: wardenId, receiver: req.user.id }
      ]
    })
    .populate('sender', 'name email role')
    .populate('receiver', 'name email role')
    .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      { sender: wardenId, receiver: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    console.log(`✅ Found ${messages.length} messages`);
    
    res.json({
      success: true,
      data: messages
    });
    
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send message from parent to warden
// @route   POST /api/chat/parent/send
// @access  Private (Parent only)
export const sendParentMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    console.log(`📤 Sending message from parent to warden: ${receiverId}`);
    console.log("Content:", content);
    
    if (!receiverId) {
      return res.status(400).json({ 
        success: false, 
        message: "Receiver ID is required" 
      });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Message content is required" 
      });
    }
    
    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim(),
      attachments: [],
      isDelivered: true,
      isRead: false
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role');
    
    // Emit socket event for real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', populatedMessage);
      console.log(`📡 Real-time message sent to warden ${receiverId}`);
    }
    
    console.log("✅ Message sent successfully");
    
    res.status(201).json({
      success: true,
      data: populatedMessage
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// ==================== WARDEN CHAT FUNCTIONS ====================

// @desc    Get conversations for warden (parents who messaged)
// @route   GET /api/chat/warden/conversations
// @access  Private (Warden only)
export const getWardenConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📋 Fetching conversations for warden ${userId}`);

    // Get warden's hostel
    const warden = await User.findById(userId).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({
        success: false,
        message: 'No hostel assigned to this warden'
      });
    }

    // Get all students in warden's hostel
    const students = await Student.find({ hostel: warden.hostel._id });
    const studentIds = students.map(s => s._id);

    // Get all parents linked to these students
    const parents = await Parent.find({ students: { $in: studentIds } })
      .populate('user', 'name email phone');

    console.log(`✅ Found ${parents.length} parents in hostel`);

    const conversations = [];

    for (const parent of parents) {
      if (!parent.user) continue;

      // Get last message between warden and this parent
      const lastMessage = await Message.findOne({
        $or: [
          { sender: userId, receiver: parent.user._id },
          { sender: parent.user._id, receiver: userId }
        ]
      })
      .sort({ createdAt: -1 })
      .populate('sender', 'name')
      .populate('receiver', 'name');

      // Get unread count for warden
      const unreadCount = await Message.countDocuments({
        sender: parent.user._id,
        receiver: userId,
        isRead: false
      });

      conversations.push({
        id: parent.user._id.toString(),
        participant: {
          _id: parent.user._id,
          name: parent.user.name || 'Unknown',
          email: parent.user.email,
          role: 'parent',
          phone: parent.user.phone
        },
        lastMessage: lastMessage || null,
        lastMessageAt: lastMessage?.createdAt || null,
        unreadCount
      });
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });

    console.log(`✅ Returning ${conversations.length} conversations for warden`);

    res.json({
      success: true,
      data: conversations
    });

  } catch (error) {
    console.error('❌ Error in getWardenConversations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get chat messages for warden with a specific parent
// @route   GET /api/chat/warden/chat/:parentId
// @access  Private (Warden only)
export const getWardenChatMessages = async (req, res) => {
  try {
    const { parentId } = req.params;
    const userId = req.user.id;

    console.log(`💬 Fetching messages between warden ${userId} and parent ${parentId}`);

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: parentId },
        { sender: parentId, receiver: userId }
      ],
      isDeleted: false
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email role')
    .populate('receiver', 'name email role');

    // Mark messages as read
    await Message.updateMany(
      {
        sender: parentId,
        receiver: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    console.log(`✅ Found ${messages.length} messages`);

    res.json({
      success: true,
      data: messages
    });

  } catch (error) {
    console.error('Error fetching warden chat messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send message from warden to parent
// @route   POST /api/chat/warden/send
// @access  Private (Warden only)
export const sendWardenMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    console.log(`📤 Sending message from warden ${req.user.id} to parent ${receiverId}`);
    console.log("Content:", content);
    
    if (!receiverId) {
      return res.status(400).json({ 
        success: false, 
        message: "Receiver ID is required" 
      });
    }
    
    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Message content is required" 
      });
    }
    
    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim(),
      attachments: [],
      isDelivered: true,
      isRead: false
    });
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email role')
      .populate('receiver', 'name email role');
    
    // Emit socket event for real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', populatedMessage);
      console.log(`📡 Real-time message sent to parent ${receiverId}`);
    }
    
    console.log("✅ Message sent successfully");
    
    res.status(201).json({
      success: true,
      data: populatedMessage
    });
    
  } catch (error) {
    console.error("Error sending warden message:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};