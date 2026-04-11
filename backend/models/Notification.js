const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['emergency', 'appointment', 'vitals', 'info'], default: 'info' },
  read: { type: Boolean, default: false },
  relatedId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
