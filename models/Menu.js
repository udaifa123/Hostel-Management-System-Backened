import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
  hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hostel',
    required: true,
    unique: true
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
    breakfast: { start: { type: String, default: '07:00' }, end: { type: String, default: '09:00' } },
    lunch: { start: { type: String, default: '12:00' }, end: { type: String, default: '14:00' } },
    snacks: { start: { type: String, default: '17:00' }, end: { type: String, default: '18:00' } },
    dinner: { start: { type: String, default: '19:00' }, end: { type: String, default: '21:00' } }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Menu = mongoose.models.Menu || mongoose.model('Menu', menuSchema);
export default Menu;