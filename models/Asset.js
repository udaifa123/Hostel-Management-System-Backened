import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: ['Furniture', 'Electrical', 'Electronic', 'Sanitary', 'Kitchen', 'Sports', 'Other'],
    default: 'Furniture'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: 0,
    default: 0
  },
  availableQuantity: {
    type: Number,
    default: 0
  },
  usedQuantity: {
    type: Number,
    default: 0
  },
  damagedQuantity: {
    type: Number,
    default: 0
  },
  condition: {
    type: String,
    enum: ['Good', 'Fair', 'Damaged', 'Under Maintenance'],
    default: 'Good'
  },
  description: {
    type: String,
    trim: true
  },
  manufacturer: {
    type: String,
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    default: 0
  },
  warrantyExpiry: {
    type: Date
  },
  notes: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

const Asset = mongoose.model('Asset', assetSchema);
export default Asset;