import Maintenance from '../models/Maintenance.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Notification from '../models/Notification.js';

// @desc    Create maintenance request
// @route   POST /api/maintenance
export const createMaintenanceRequest = async (req, res) => {
  try {
    console.log('📝 Creating maintenance request:', req.body);
    
    const {
      title,
      description,
      type,
      priority,
      roomId,
      reportedBy,
      contactNumber
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !priority) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, type, priority'
      });
    }

    // Get the warden/hostel info
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate request number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const requestNumber = `MNT${year}${month}${random}`;

    // Create maintenance request
    const maintenance = await Maintenance.create({
      requestNumber,
      title,
      description,
      type,
      priority,
      status: 'pending',
      roomId: roomId || null,
      reportedBy: reportedBy || req.user.id,
      createdBy: req.user.id,
      contactNumber: contactNumber || user.phone || '',
      images: [],
      notes: []
    });

    console.log('✅ Maintenance created:', maintenance._id);

    res.status(201).json({
      success: true,
      data: maintenance,
      message: 'Maintenance request created successfully'
    });

  } catch (error) {
    console.error('❌ Create maintenance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create maintenance request'
    });
  }
};

// @desc    Get all maintenance requests
// @route   GET /api/maintenance
export const getMaintenanceRequests = async (req, res) => {
  try {
    const { status, priority, roomId } = req.query;
    let query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (roomId) query.roomId = roomId;

    const requests = await Maintenance.find(query)
      .populate('roomId', 'roomNumber block')
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });

  } catch (error) {
    console.error('Get maintenance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get maintenance request by ID
// @route   GET /api/maintenance/:id
export const getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate('roomId', 'roomNumber block floor')
      .populate('reportedBy', 'name email phone')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .populate('notes.createdBy', 'name');

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      data: maintenance
    });

  } catch (error) {
    console.error('Get maintenance by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update maintenance status
// @route   PUT /api/maintenance/:id/status
export const updateMaintenanceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const updateData = { status, updatedAt: new Date() };
    if (status === 'in-progress') updateData.startedAt = new Date();
    if (status === 'completed') updateData.completedAt = new Date();
    
    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      data: maintenance,
      message: `Maintenance status updated to ${status}`
    });

  } catch (error) {
    console.error('Update maintenance status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign maintenance to staff
// @route   PUT /api/maintenance/:id/assign
export const assignMaintenance = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo,
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true }
    );

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      data: maintenance,
      message: 'Maintenance assigned successfully'
    });

  } catch (error) {
    console.error('Assign maintenance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Complete maintenance
// @route   PUT /api/maintenance/:id/complete
export const completeMaintenance = async (req, res) => {
  try {
    const { resolution, cost, timeSpent } = req.body;
    
    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        completedAt: new Date(),
        resolution,
        cost,
        timeSpent
      },
      { new: true }
    );

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      data: maintenance,
      message: 'Maintenance completed successfully'
    });

  } catch (error) {
    console.error('Complete maintenance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add maintenance note
// @route   POST /api/maintenance/:id/notes
export const addMaintenanceNote = async (req, res) => {
  try {
    const { note } = req.body;
    
    if (!note) {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }

    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    maintenance.notes.push({
      note,
      createdBy: req.user.id,
      createdAt: new Date()
    });

    await maintenance.save();

    res.json({
      success: true,
      data: maintenance,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Add maintenance note error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete maintenance request
// @route   DELETE /api/maintenance/:id
export const deleteMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findByIdAndDelete(req.params.id);

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance request not found'
      });
    }

    res.json({
      success: true,
      message: 'Maintenance request deleted successfully'
    });

  } catch (error) {
    console.error('Delete maintenance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get maintenance statistics
// @route   GET /api/maintenance/stats
export const getMaintenanceStats = async (req, res) => {
  try {
    const total = await Maintenance.countDocuments();
    const pending = await Maintenance.countDocuments({ status: 'pending' });
    const inProgress = await Maintenance.countDocuments({ status: 'in-progress' });
    const completed = await Maintenance.countDocuments({ status: 'completed' });
    
    const urgent = await Maintenance.countDocuments({ priority: 'urgent' });
    const high = await Maintenance.countDocuments({ priority: 'high' });

    res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        completed,
        urgent,
        high
      }
    });

  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get maintenance history
// @route   GET /api/maintenance/history
export const getMaintenanceHistory = async (req, res) => {
  try {
    const { startDate, endDate, roomId } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (roomId) query.roomId = roomId;

    const history = await Maintenance.find(query)
      .populate('roomId', 'roomNumber block')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: history.length,
      data: history
    });

  } catch (error) {
    console.error('Get maintenance history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};