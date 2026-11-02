const express = require('express');
const Inventory = require('../models/Inventory');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logActivity } = require('../utils/auditLogger');

const router = express.Router();

// ================= LIST INVENTORY =================

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { category, status, search } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ itemName: reg }, { sku: reg }, { manufacturer: reg }];
    }

    const items = await Inventory.find(query).sort({ stockQuantity: 1, itemName: 1 });
    res.json({ success: true, count: items.length, items });
  } catch (error) {
    next(error);
  }
});

// ================= LOW-STOCK ALERTS =================

router.get('/alerts/low-stock', authenticateToken, async (req, res, next) => {
  try {
    const alerts = await Inventory.find({
      $or: [
        { status: { $in: ['low_stock', 'out_of_stock'] } },
        { $expr: { $lte: ['$stockQuantity', '$reorderThreshold'] } }
      ]
    }).sort({ stockQuantity: 1 });

    res.json({
      success: true,
      count: alerts.length,
      alerts: alerts.map((item) => ({
        id: item._id,
        itemName: item.itemName,
        sku: item.sku,
        stockQuantity: item.stockQuantity,
        reorderThreshold: item.reorderThreshold,
        status: item.stockQuantity === 0 ? 'out_of_stock' : item.stockQuantity <= item.reorderThreshold ? 'low_stock' : 'in_stock',
        unit: item.unit
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ================= ADD INVENTORY ITEM =================

router.post('/', authenticateToken, authorizeRoles('admin', 'pharmacist', 'nurse', 'receptionist', 'staff'), async (req, res, next) => {
  try {
    const { itemName, sku, category, stockQuantity, reorderThreshold, unitPrice, unit, expiryDate, manufacturer, supplier } = req.body;

    if (!itemName || unitPrice === undefined || unitPrice === '') {
      return res.status(400).json({
        success: false,
        error: 'Item name and unit price are required.'
      });
    }

    let finalSku = (sku && sku.trim()) ? sku.trim().toUpperCase() : `MED-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const existing = await Inventory.findOne({ sku: finalSku });
    if (existing) {
      if (sku && sku.trim()) {
        return res.status(409).json({ success: false, error: 'An item with that SKU already exists.' });
      }
      finalSku = `${finalSku}-${Math.floor(10 + Math.random() * 90)}`;
    }

    const item = new Inventory({
      itemName: itemName.trim(),
      sku: finalSku,
      category: category || 'other',
      stockQuantity: Number(stockQuantity) >= 0 ? Number(stockQuantity) : 0,
      reorderThreshold: Number(reorderThreshold) >= 0 ? Number(reorderThreshold) : 20,
      unitPrice: Number(unitPrice),
      unit: unit || 'tablets',
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      manufacturer: manufacturer ? manufacturer.trim() : 'Generic / Hospital Formulary',
      supplier: supplier ? supplier.trim() : 'Hospital MedSupply Corp'
    });

    await item.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Staff',
      userRole: req.user.role,
      action: 'INVENTORY_ADD',
      resourceType: 'Inventory',
      resourceId: item._id,
      details: `Added new pharmacy inventory item: ${item.itemName} (${item.sku}) with ${item.stockQuantity} ${item.unit}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, message: 'Item added to inventory successfully', item });
  } catch (error) {
    next(error);
  }
});

// ================= ADJUST / RESTOCK QUANTITY =================

router.patch('/:id/stock', authenticateToken, authorizeRoles('admin', 'pharmacist', 'nurse'), async (req, res, next) => {
  try {
    const { changeQuantity, newQuantity } = req.body;
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Inventory item not found.' });
    }

    if (newQuantity !== undefined) {
      item.stockQuantity = Math.max(0, Number(newQuantity));
    } else if (changeQuantity !== undefined) {
      item.stockQuantity = Math.max(0, item.stockQuantity + Number(changeQuantity));
    } else {
      return res.status(400).json({ success: false, error: 'Provide newQuantity or changeQuantity.' });
    }

    await item.save();

    logActivity({
      userId: req.user.id,
      userName: req.user.name || 'Staff',
      userRole: req.user.role,
      action: 'INVENTORY_ADJUST',
      resourceType: 'Inventory',
      resourceId: item._id,
      details: `Adjusted stock for ${item.itemName} to ${item.stockQuantity}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Stock updated successfully', item });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
