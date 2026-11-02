const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: {
      type: String,
      enum: ['antibiotics', 'analgesics', 'cardiovascular', 'diabetes', 'respiratory', 'emergency', 'critical', 'supplies', 'vaccines', 'other'],
      default: 'other'
    },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    reorderThreshold: { type: Number, required: true, min: 0, default: 20 },
    unitPrice: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'tablets' }, // tablets, vials, boxes, bottles
    expiryDate: { type: Date },
    manufacturer: { type: String, default: 'Generic' },
    supplier: { type: String, default: 'Hospital MedSupply Corp' },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock'
    }
  },
  { timestamps: true }
);

inventorySchema.index({ sku: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ itemName: 'text' });

inventorySchema.pre('save', function (next) {
  if (this.stockQuantity === 0) {
    this.status = 'out_of_stock';
  } else if (this.stockQuantity <= this.reorderThreshold) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
