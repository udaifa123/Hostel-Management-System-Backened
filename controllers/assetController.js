import Asset from '../models/Asset.js';
import AssetAssignment from '../models/AssetAssignment.js';
import Student from '../models/Student.js';
import Room from '../models/Room.js';


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


export const createAsset = async (req, res) => {
  try {
    console.log('Creating asset with data:', req.body);
    
    const {
      name, category, quantity, condition, description,
      manufacturer, modelNumber, purchaseDate, purchasePrice,
      warrantyExpiry, notes
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Asset name is required' });
    }
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });
    }
    
    const quantityNum = parseInt(quantity);
    
    const assetData = {
      name: name.trim(),
      category: category || 'Furniture',
      quantity: quantityNum,
      availableQuantity: quantityNum,
      usedQuantity: 0,
      damagedQuantity: 0,
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


export const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    
    const asset = await Asset.findById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }
    
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
    
    
    const assignment = new AssetAssignment({
      assetId: asset._id,
      studentId: studentId || null,
      roomId: roomId || null,
      quantity: quantityNum,
      assignmentType: assignmentType || 'common',
      assignedDate: new Date(),
      assignedBy: req.user.id,
      status: 'active',
      remarks: remarks || ''
    });
    
    await assignment.save();
    
    
    asset.usedQuantity += quantityNum;
    asset.availableQuantity = asset.quantity - (asset.usedQuantity + asset.damagedQuantity);
    await asset.save();
    
   
    const populatedAssignment = await AssetAssignment.findById(assignment._id)
      .populate('assetId', 'name category condition')
      .populate('studentId', 'name rollNumber')
      .populate('roomId', 'roomNumber block');
    
    res.status(201).json({
      success: true,
      message: 'Asset assigned successfully',
      data: populatedAssignment
    });
  } catch (error) {
    console.error('Error assigning asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAssignments = async (req, res) => {
  try {
    const assignments = await AssetAssignment.find({ status: 'active' })
      .populate('assetId', 'name category condition quantity availableQuantity')
      .populate('studentId', 'name rollNumber')
      .populate('roomId', 'roomNumber block')
      .sort({ assignedDate: -1 });
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAssignmentById = async (req, res) => {
  try {
    const assignment = await AssetAssignment.findById(req.params.id)
      .populate('assetId', 'name category condition quantity availableQuantity')
      .populate('studentId', 'name rollNumber')
      .populate('roomId', 'roomNumber block');
    
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const replaceAsset = async (req, res) => {
  try {
    const { assignmentId, newAssetId, reason, notes } = req.body;
    
    console.log('🔄 Replacing asset:', { assignmentId, newAssetId, reason });
    
    
    const oldAssignment = await AssetAssignment.findById(assignmentId).populate('assetId');
    if (!oldAssignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    if (oldAssignment.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This assignment is no longer active' });
    }
    
    
    const newAsset = await Asset.findById(newAssetId);
    if (!newAsset) {
      return res.status(404).json({ success: false, message: 'Replacement asset not found' });
    }
    
    
    if (newAsset.availableQuantity < oldAssignment.quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `Only ${newAsset.availableQuantity} items available in ${newAsset.name}` 
      });
    }
    
   
    const oldAsset = await Asset.findById(oldAssignment.assetId);
    

    oldAssignment.status = 'damaged';
    oldAssignment.returnDate = new Date();
    oldAssignment.remarks = `REPLACED: ${reason}. New asset: ${newAsset.name}. ${notes || ''}`;
    await oldAssignment.save();
    
   
    oldAsset.usedQuantity -= oldAssignment.quantity;
    oldAsset.damagedQuantity += oldAssignment.quantity;
    oldAsset.availableQuantity = oldAsset.quantity - (oldAsset.usedQuantity + oldAsset.damagedQuantity);
    

    if (oldAsset.damagedQuantity >= oldAsset.quantity) {
      oldAsset.condition = 'Damaged';
    }
    await oldAsset.save();
    
   
    newAsset.availableQuantity -= oldAssignment.quantity;
    newAsset.usedQuantity += oldAssignment.quantity;
    await newAsset.save();
    
    
    const newAssignment = new AssetAssignment({
      assetId: newAssetId,
      studentId: oldAssignment.studentId,
      roomId: oldAssignment.roomId,
      quantity: oldAssignment.quantity,
      assignmentType: oldAssignment.assignmentType,
      assignedDate: new Date(),
      assignedBy: req.user.id,
      status: 'active',
      remarks: `Replacement for ${oldAsset.name}. Reason: ${reason}. ${notes || ''}`
    });
    
    await newAssignment.save();
    
    
    const populatedNewAssignment = await AssetAssignment.findById(newAssignment._id)
      .populate('assetId', 'name category condition')
      .populate('studentId', 'name rollNumber')
      .populate('roomId', 'roomNumber block');
    
    console.log('✅ Asset replaced successfully');
    
    res.json({
      success: true,
      message: `Successfully replaced ${oldAsset.name} with ${newAsset.name}`,
      data: {
        oldAssignment: {
          _id: oldAssignment._id,
          asset: oldAsset.name,
          quantity: oldAssignment.quantity,
          status: 'replaced'
        },
        newAssignment: populatedNewAssignment,
        oldAsset: {
          name: oldAsset.name,
          usedQuantity: oldAsset.usedQuantity,
          damagedQuantity: oldAsset.damagedQuantity,
          availableQuantity: oldAsset.availableQuantity
        },
        newAsset: {
          name: newAsset.name,
          usedQuantity: newAsset.usedQuantity,
          availableQuantity: newAsset.availableQuantity
        }
      }
    });
  } catch (error) {
    console.error('Error replacing asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const returnAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition, remarks } = req.body;
    
    const assignment = await AssetAssignment.findById(id).populate('assetId');
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }
    
    if (assignment.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This assignment is not active' });
    }
    
    
    assignment.status = 'returned';
    assignment.returnDate = new Date();
    assignment.condition = condition || 'Good';
    assignment.remarks = remarks || assignment.remarks;
    await assignment.save();
    
    
    const asset = await Asset.findById(assignment.assetId);
    asset.usedQuantity -= assignment.quantity;
    asset.availableQuantity = asset.quantity - (asset.usedQuantity + asset.damagedQuantity);
    await asset.save();
    
    res.json({
      success: true,
      message: 'Asset returned successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


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


export const getAssetStats = async (req, res) => {
  try {
    const totalAssets = await Asset.countDocuments({ isActive: true });
    
    const assets = await Asset.find({ isActive: true });
    
    const totalQuantity = assets.reduce((sum, a) => sum + (a.quantity || 0), 0);
    const availableQuantity = assets.reduce((sum, a) => sum + (a.availableQuantity || 0), 0);
    const usedQuantity = assets.reduce((sum, a) => sum + (a.usedQuantity || 0), 0);
    const damagedQuantity = assets.reduce((sum, a) => sum + (a.damagedQuantity || 0), 0);
    
    
    const activeAssignments = await AssetAssignment.countDocuments({ status: 'active' });
    const totalAssignments = await AssetAssignment.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalAssets,
        totalQuantity,
        availableQuantity,
        usedQuantity,
        damagedQuantity,
        activeAssignments,
        totalAssignments
      }
    });
  } catch (error) {
    console.error('Error getting asset stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getReplacementHistory = async (req, res) => {
  try {
    const replacements = await AssetAssignment.find({ 
      status: 'damaged',
      remarks: { $regex: /REPLACED/i }
    })
      .populate('assetId', 'name category')
      .populate('studentId', 'name rollNumber')
      .populate('roomId', 'roomNumber block')
      .sort({ returnDate: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: replacements
    });
  } catch (error) {
    console.error('Error fetching replacement history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};