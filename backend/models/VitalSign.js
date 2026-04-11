const mongoose = require('mongoose');

const vitalSignSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  heartRate: { type: Number, required: true },
  temperature: { type: Number, required: true },
  source: { type: String, default: 'edge-simulator' },
  computingLayer: { type: String, enum: ['edge', 'fog', 'cloud'], default: 'edge' },
  processedByFog: { type: Boolean, default: false },
  emergency: { type: Boolean, default: false },
  anomalyReason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

vitalSignSchema.index({ patientId: 1, createdAt: -1 });
vitalSignSchema.index({ emergency: 1, createdAt: -1 });

module.exports = mongoose.model('VitalSign', vitalSignSchema);
