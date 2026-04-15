import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true
  },
  menu: {
    monday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    },
    tuesday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    },
    wednesday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    },
    thursday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    },
    friday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    },
    saturday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    },
    sunday: { 
      breakfast: { type: String, default: '' }, 
      lunch: { type: String, default: '' }, 
      snacks: { type: String, default: '' }, 
      dinner: { type: String, default: '' } 
    }
  },
  timings: {
    breakfast: { type: String, default: "7:00 AM" },
    lunch: { type: String, default: "12:30 PM" },
    snacks: { type: String, default: "4:00 PM" },
    dinner: { type: String, default: "7:30 PM" }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Menu = mongoose.models.Menu || mongoose.model('Menu', menuSchema);
export default Menu;