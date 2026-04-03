import Room from "../models/Room.js";
import User from "../models/User.js";
import Student from "../models/Student.js";

// @desc    Get all rooms in warden's hostel
// @route   GET /api/warden/rooms
// @access  Private (Warden only)
export const getRooms = async (req, res) => {
  try {
    console.log("🔍 Fetching rooms for warden:", req.user.id);
    
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    const rooms = await Room.find({ hostel: warden.hostel._id })
      .populate({
        path: 'occupants',
        populate: {
          path: 'user',
          select: 'name email'
        }
      })
      .sort({ block: 1, floor: 1, roomNumber: 1 });

    console.log(`✅ Found ${rooms.length} rooms`);

    res.json({
      success: true,
      count: rooms.length,
      data: rooms
    });

  } catch (error) {
    console.error('❌ Error fetching rooms:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get single room by ID
// @route   GET /api/warden/rooms/:id
// @access  Private (Warden only)
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate({
        path: 'occupants',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    res.json({
      success: true,
      data: room
    });

  } catch (error) {
    console.error('❌ Error fetching room:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Create a new room
// @route   POST /api/warden/rooms
// @access  Private (Warden only)
export const createRoom = async (req, res) => {
  try {
    console.log("📝 Creating new room:", req.body);

    const {
      roomNumber,
      block,
      floor,
      capacity,
      type,
      status
    } = req.body;

    // Validation
    if (!roomNumber || !block || !floor || !capacity || !type) {
      return res.status(400).json({
        success: false,
        message: "Room number, block, floor, capacity and type are required"
      });
    }

    // Get warden's hostel
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(400).json({
        success: false,
        message: "No hostel assigned to this warden"
      });
    }

    // Check if room already exists in this hostel
    const existingRoom = await Room.findOne({
      roomNumber,
      block,
      hostel: warden.hostel._id
    });

    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: `Room ${roomNumber} in Block ${block} already exists`
      });
    }

    // Create room
    const room = await Room.create({
      roomNumber,
      block,
      floor: parseInt(floor),
      capacity: parseInt(capacity),
      type,
      status: status || 'available',
      hostel: warden.hostel._id,
      occupants: []
    });

    console.log("✅ Room created successfully:", room._id);

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: room
    });

  } catch (error) {
    console.error("❌ Error creating room:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists in this block"
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Server error while creating room"
    });
  }
};

// @desc    Update a room
// @route   PUT /api/warden/rooms/:id
// @access  Private (Warden only)
export const updateRoom = async (req, res) => {
  try {
    const {
      roomNumber,
      block,
      floor,
      capacity,
      type,
      status
    } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check if room has occupants and trying to reduce capacity below current occupants
    if (capacity && capacity < room.occupants?.length) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce capacity below current occupants (${room.occupants.length})`
      });
    }

    // Update room
    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      {
        roomNumber: roomNumber || room.roomNumber,
        block: block || room.block,
        floor: floor || room.floor,
        capacity: capacity || room.capacity,
        type: type || room.type,
        status: status || room.status
      },
      { new: true, runValidators: true }
    ).populate({
      path: 'occupants',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

    res.json({
      success: true,
      message: "Room updated successfully",
      data: updatedRoom
    });

  } catch (error) {
    console.error("❌ Error updating room:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Room number already exists in this block"
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating room"
    });
  }
};

// @desc    Delete a room
// @route   DELETE /api/warden/rooms/:id
// @access  Private (Warden only)
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Check if room has occupants
    if (room.occupants && room.occupants.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete room with occupants"
      });
    }

    await room.deleteOne();

    res.json({
      success: true,
      message: "Room deleted successfully"
    });

  } catch (error) {
    console.error("❌ Error deleting room:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while deleting room"
    });
  }
};

// @desc    Update room occupants
// @route   PUT /api/warden/rooms/:id/occupants
// @access  Private (Warden only)
export const updateRoomOccupants = async (req, res) => {
  try {
    const { occupantIds } = req.body;

    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Validate occupant count
    if (occupantIds.length > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more than ${room.capacity} occupants`
      });
    }

    // Update room occupants
    room.occupants = occupantIds;
    await room.save();

    const updatedRoom = await Room.findById(room._id)
      .populate({
        path: 'occupants',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    res.json({
      success: true,
      message: "Room occupants updated successfully",
      data: updatedRoom
    });

  } catch (error) {
    console.error("❌ Error updating occupants:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating occupants"
    });
  }
};

// @desc    Remove occupant from room
// @route   DELETE /api/warden/rooms/:roomId/occupants/:studentId
// @access  Private (Warden only)
export const removeOccupant = async (req, res) => {
  try {
    const { roomId, studentId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    // Remove student from room occupants
    room.occupants = room.occupants.filter(id => id.toString() !== studentId);
    await room.save();

    const updatedRoom = await Room.findById(roomId)
      .populate({
        path: 'occupants',
        populate: {
          path: 'user',
          select: 'name email'
        }
      });

    res.json({
      success: true,
      message: "Occupant removed successfully",
      data: updatedRoom
    });

  } catch (error) {
    console.error("❌ Error removing occupant:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while removing occupant"
    });
  }
};