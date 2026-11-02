const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    bedNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    wardNumber: { type: String, required: true, trim: true },
    wardType: {
      type: String,
      enum: ['general', 'icu', 'emergency', 'maternity', 'pediatric', 'private'],
      default: 'general'
    },
    floor: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['available', 'occupied', 'cleaning', 'maintenance'],
      default: 'available',
      index: true
    },
    currentPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    admittedAt: { type: Date, default: null },
    dailyRate: { type: Number, required: true, min: 0, default: 50 },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

bedSchema.index({ wardType: 1, status: 1 });
bedSchema.index({ bedNumber: 1 });

module.exports = mongoose.model('Bed', bedSchema);
