import Asset from '../models/Asset.js';

// Get all assets
export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ isActive: true }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: assets.length,
      data: assets
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single asset
export const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
    res.json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new asset
export const createAsset = async (req, res) => {
  try {
    console.log('Creating asset with data:', req.body);
    
    const {
      name, category, quantity, condition, description,
      manufacturer, modelNumber, purchaseDate, purchasePrice,
      warrantyExpiry, notes
    } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ success: false, message: 'Asset name is required' });
    }
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }
    
    const quantityNum = parseInt(quantity);
    
    // Calculate available quantity
    const availableQuantity = quantityNum;
    const usedQuantity = 0;
    const damagedQuantity = 0;
    
    const assetData = {
      name: name.trim(),
      category: category || 'Furniture',
      quantity: quantityNum,
      availableQuantity: availableQuantity,
      usedQuantity: usedQuantity,
      damagedQuantity: damagedQuantity,
      condition: condition || 'Good',
      description: description || '',
      manufacturer: manufacturer || '',
      modelNumber: modelNumber || '',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : 0,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
      notes: notes || '',
      createdBy: req.user?.id || null
    };
    
    const asset = new Asset(assetData);
    await asset.save();
    
    console.log('Asset created successfully:', asset);
    
    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: asset
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update asset
export const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, category, quantity, condition, description,
      manufacturer, modelNumber, purchaseDate, purchasePrice,
      warrantyExpiry, notes
    } = req.body;
    
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (condition !== undefined) updateData.condition = condition;
    if (description !== undefined) updateData.description = description;
    if (manufacturer !== undefined) updateData.manufacturer = manufacturer;
    if (modelNumber !== undefined) updateData.modelNumber = modelNumber;
    if (notes !== undefined) updateData.notes = notes;
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (purchasePrice !== undefined) updateData.purchasePrice = parseFloat(purchasePrice);
    if (warrantyExpiry !== undefined) updateData.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null;
    
    // Handle quantity update
    if (quantity !== undefined) {
      const newQuantity = parseInt(quantity);
      updateData.quantity = newQuantity;
      updateData.availableQuantity = newQuantity - (asset.usedQuantity + asset.damagedQuantity);
    }
    
    const updatedAsset = await Asset.findByIdAndUpdate(id, updateData, { new: true });
    
    res.json({
      success: true,
      message: 'Asset updated successfully',
      data: updatedAsset
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete asset
export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
    // Soft delete
    asset.isActive = false;
    await asset.save();
    
    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign asset
export const assignAsset = async (req, res) => {
  try {
    const { assetId, studentId, roomId, quantity, assignmentType, remarks } = req.body;
    
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
    const quantityNum = parseInt(quantity) || 1;
    
    if (asset.availableQuantity < quantityNum) {
      return res.status(400).json({
        success: false,
        message: `Only ${asset.availableQuantity} items available`
      });
    }
    
    // Update asset quantities
    asset.usedQuantity += quantityNum;
    asset.availableQuantity = asset.quantity - (asset.usedQuantity + asset.damagedQuantity);
    await asset.save();
    
    res.status(201).json({
      success: true,
      message: 'Asset assigned successfully',
      data: { assetId, quantity: quantityNum, assignmentType }
    });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark asset as damaged
export const markDamaged = async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
    if (asset.availableQuantity > 0) {
      asset.availableQuantity -= 1;
      asset.damagedQuantity += 1;
    } else if (asset.usedQuantity > 0) {
      asset.usedQuantity -= 1;
      asset.damagedQuantity += 1;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'No items available to mark as damaged' 
      });
    }
    
    asset.condition = 'Damaged';
    await asset.save();
    
    res.json({
      success: true,
      message: 'Asset marked as damaged',
      data: asset
    });
  } catch (error) {
    console.error('Error marking damaged:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get asset statistics
export const getAssetStats = async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments({ isActive: true });
    
    const assets = await Asset.find({ isActive: true });
    
    const totalQuantity = assets.reduce((sum, a) => sum + (a.quantity || 0), 0);
    const availableQuantity = assets.reduce((sum, a) => sum + (a.availableQuantity || 0), 0);
    const usedQuantity = assets.reduce((sum, a) => sum + (a.usedQuantity || 0), 0);
    const damagedQuantity = assets.reduce((sum, a) => sum + (a.damagedQuantity || 0), 0);
    
    res.json({
      success: true,
      data: {
        totalAssets,
        totalQuantity,
        availableQuantity,
        usedQuantity,
        damagedQuantity
      }
    });
  } catch (error) {
    console.error('Error getting asset stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};