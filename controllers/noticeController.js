import Notice from '../models/Notice.js';
import User from '../models/User.js';

// ==================== CREATE NOTICE ====================
export const createNotice = async (req, res) => {
  try {
    console.log('📝 Creating notice...');
    const { title, content, category, pinned } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const warden = await User.findById(req.user.id).populate('hostel');

    const notice = await Notice.create({
      title,
      content,
      category: category || 'general',
      pinned: pinned || false,
      createdBy: req.user.id,
      hostel: warden.hostel?._id || null,
      date: new Date().toISOString().split('T')[0]
    });

    console.log('✅ Notice created:', notice._id);

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: notice
    });
  } catch (error) {
    console.error('Error creating notice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET ALL NOTICES ====================
export const getNotices = async (req, res) => {
  try {
    console.log('📋 Fetching notices...');
    
    const warden = await User.findById(req.user.id).populate('hostel');
    
    let query = { isActive: true };
    if (warden.hostel) {
      query.hostel = warden.hostel._id;
    }
    
    const notices = await Notice.find(query)
      .populate('createdBy', 'name email')
      .sort({ pinned: -1, createdAt: -1 });

    console.log(`✅ Found ${notices.length} notices`);

    res.json({
      success: true,
      count: notices.length,
      data: notices
    });
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== UPDATE NOTICE ====================
export const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;

    const notice = await Notice.findById(id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this notice'
      });
    }

    const updatedNotice = await Notice.findByIdAndUpdate(
      id,
      {
        title: title || notice.title,
        content: content || notice.content,
        category: category || notice.category,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Notice updated successfully',
      data: updatedNotice
    });
  } catch (error) {
    console.error('Error updating notice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== DELETE NOTICE ====================
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this notice'
      });
    }

    await Notice.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== PIN/UNPIN NOTICE ====================
export const pinNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const { pinned } = req.body;

    const notice = await Notice.findById(id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (notice.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to pin/unpin this notice'
      });
    }

    const updatedNotice = await Notice.findByIdAndUpdate(
      id,
      { pinned: pinned },
      { new: true }
    );

    res.json({
      success: true,
      message: pinned ? 'Notice pinned successfully' : 'Notice unpinned successfully',
      data: updatedNotice
    });
  } catch (error) {
    console.error('Error pinning notice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET NOTICE BY ID ====================
export const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notice = await Notice.findById(id)
      .populate('createdBy', 'name email');
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      data: notice
    });
  } catch (error) {
    console.error('Error fetching notice:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};