import Menu from "../models/Menu.js";
import User from "../models/User.js";
import MenuHistory from "../models/MenuHistory.js";
import Parent from "../models/Parent.js";
import Student from "../models/Student.js";

// @desc    Get current menu
// @route   GET /api/mess/menu
// @access  Private (Warden only)
export const getMenu = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned to this warden" 
      });
    }

    let menu = await Menu.findOne({ hostel: warden.hostel._id });

    if (!menu) {
      // Create default menu if none exists
      const defaultMenu = {
        monday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
        tuesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
        wednesday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
        thursday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
        friday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
        saturday: { breakfast: '', lunch: '', snacks: '', dinner: '' },
        sunday: { breakfast: '', lunch: '', snacks: '', dinner: '' }
      };

      menu = await Menu.create({
        hostel: warden.hostel._id,
        menu: defaultMenu,
        createdBy: req.user.id
      });
    }

    res.json({
      success: true,
      data: menu.menu
    });

  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update menu
// @route   POST /api/mess/update
// @access  Private (Warden only)
export const updateMenu = async (req, res) => {
  try {
    const { day, meal, value, menu: updatedMenuData } = req.body;

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    let menu = await Menu.findOne({ hostel: warden.hostel._id });

    if (!menu) {
      menu = new Menu({
        hostel: warden.hostel._id,
        menu: {},
        createdBy: req.user.id
      });
    }

    // Track changes for history
    const changes = [];

    if (meal === 'all') {
      // Update entire day
      const oldDayMenu = menu.menu[day] || {};
      Object.keys(updatedMenuData).forEach(mealType => {
        if (oldDayMenu[mealType] !== updatedMenuData[mealType]) {
          changes.push({
            day,
            meal: mealType,
            oldValue: oldDayMenu[mealType] || '',
            newValue: updatedMenuData[mealType]
          });
        }
      });
      menu.menu[day] = updatedMenuData;
    } else {
      // Update single meal
      if (!menu.menu[day]) menu.menu[day] = {};
      const oldValue = menu.menu[day][meal] || '';
      
      if (oldValue !== value) {
        changes.push({
          day,
          meal,
          oldValue,
          newValue: value
        });
      }
      
      menu.menu[day][meal] = value;
    }

    menu.updatedBy = req.user.id;
    menu.updatedAt = Date.now();
    await menu.save();

    // Save to history
    if (changes.length > 0) {
      await MenuHistory.create({
        hostel: warden.hostel._id,
        changes,
        changedBy: req.user.id,
        changedAt: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Menu updated successfully",
      data: menu.menu
    });

  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Copy menu from one day to another
// @route   POST /api/mess/copy
// @access  Private (Warden only)
export const copyMenu = async (req, res) => {
  try {
    const { sourceDay, targetDay } = req.body;

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    const menu = await Menu.findOne({ hostel: warden.hostel._id });

    if (!menu) {
      return res.status(404).json({ 
        success: false, 
        message: "Menu not found" 
      });
    }

    const sourceMenu = menu.menu[sourceDay];
    if (!sourceMenu) {
      return res.status(400).json({ 
        success: false, 
        message: "Source day menu not found" 
      });
    }

    // Copy menu
    menu.menu[targetDay] = { ...sourceMenu };
    menu.updatedBy = req.user.id;
    menu.updatedAt = Date.now();
    await menu.save();

    // Save to history
    await MenuHistory.create({
      hostel: warden.hostel._id,
      changes: [{
        day: targetDay,
        meal: 'all',
        oldValue: 'Copied from ' + sourceDay,
        newValue: 'Menu copied'
      }],
      changedBy: req.user.id,
      changedAt: Date.now()
    });

    res.json({
      success: true,
      message: `Menu copied from ${sourceDay} to ${targetDay}`,
      data: menu.menu
    });

  } catch (error) {
    console.error('Error copying menu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Clear day menu
// @route   POST /api/mess/clear
// @access  Private (Warden only)
export const clearDay = async (req, res) => {
  try {
    const { day } = req.body;

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    const menu = await Menu.findOne({ hostel: warden.hostel._id });

    if (!menu) {
      return res.status(404).json({ 
        success: false, 
        message: "Menu not found" 
      });
    }

    const oldMenu = menu.menu[day] || {};

    // Clear day menu
    menu.menu[day] = { breakfast: '', lunch: '', snacks: '', dinner: '' };
    menu.updatedBy = req.user.id;
    menu.updatedAt = Date.now();
    await menu.save();

    // Save to history
    const changes = Object.keys(oldMenu).map(meal => ({
      day,
      meal,
      oldValue: oldMenu[meal] || '',
      newValue: ''
    }));

    await MenuHistory.create({
      hostel: warden.hostel._id,
      changes,
      changedBy: req.user.id,
      changedAt: Date.now()
    });

    res.json({
      success: true,
      message: `Menu cleared for ${day}`,
      data: menu.menu
    });

  } catch (error) {
    console.error('Error clearing menu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get menu history
// @route   GET /api/mess/history
// @access  Private (Warden only)
export const getMenuHistory = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    const history = await MenuHistory.find({ hostel: warden.hostel._id })
      .populate('changedBy', 'name')
      .sort({ changedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update meal timings
// @route   PUT /api/mess/timings
// @access  Private (Warden only)
export const updateTimings = async (req, res) => {
  try {
    const { breakfast, lunch, snacks, dinner } = req.body;

    const warden = await User.findById(req.user.id).populate('hostel');
    
    if (!warden.hostel) {
      return res.status(404).json({ 
        success: false, 
        message: "No hostel assigned" 
      });
    }

    let menu = await Menu.findOne({ hostel: warden.hostel._id });

    if (!menu) {
      menu = new Menu({
        hostel: warden.hostel._id,
        menu: {},
        timings: { breakfast, lunch, snacks, dinner },
        createdBy: req.user.id
      });
    } else {
      menu.timings = { breakfast, lunch, snacks, dinner };
      menu.updatedBy = req.user.id;
      menu.updatedAt = Date.now();
    }

    await menu.save();

    res.json({
      success: true,
      message: "Timings updated successfully",
      data: menu.timings
    });

  } catch (error) {
    console.error('Error updating timings:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};




// @desc    Get weekly menu for parents
// @route   GET /api/mess/parent/menu
export const getWeeklyMenu = async (req, res) => {
  try {
    // 🔥 Get parent with students
    let parent = await Parent.findOne({ user: req.user._id })
      .populate({
        path: "students",
        populate: { path: "hostel" }
      });

    // ❗ AUTO FIX: If no students linked → find by parentPhone
    if (!parent || parent.students.length === 0) {

      const student = await Student.findOne({
        parentPhone: req.user.phone
      }).populate("hostel");

      if (student) {
        // 🔥 Auto link student to parent
        parent = await Parent.findOneAndUpdate(
          { user: req.user._id },
          { $addToSet: { students: student._id } },
          { new: true }
        ).populate({
          path: "students",
          populate: { path: "hostel" }
        });
      }
    }

    if (!parent || parent.students.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const hostelId = parent.students[0]?.hostel?._id;

    if (!hostelId) {
      return res.json({ success: true, data: [] });
    }

    const menu = await Menu.findOne({ hostel: hostelId });

    if (!menu) {
      return res.json({ success: true, data: [] });
    }

    const weeklyMenu = Object.keys(menu.menu).map(day => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      meals: menu.menu[day],
      special: menu.menu[day]?.special || ''
    }));

    res.json({
      success: true,
      data: weeklyMenu
    });

  } catch (error) {
    console.error("Menu error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




export const getParentTimings = async (req, res) => {
  try {
    let parent = await Parent.findOne({ user: req.user._id })
      .populate({
        path: "students",
        populate: { path: "hostel" }
      });

    if (!parent || parent.students.length === 0) {
      const student = await Student.findOne({
        parentPhone: req.user.phone
      }).populate("hostel");

      if (student) {
        parent = await Parent.findOneAndUpdate(
          { user: req.user._id },
          { $addToSet: { students: student._id } },
          { new: true }
        ).populate({
          path: "students",
          populate: { path: "hostel" }
        });
      }
    }

    const hostelId = parent?.students[0]?.hostel?._id;

    const menu = await Menu.findOne({ hostel: hostelId });

    res.json({
      success: true,
      data: menu?.timings || {}
    });

  } catch (error) {
    console.error("Timing error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};