const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },

  conditionType: {
    type: String,
    enum: ['critical', 'moderate', 'normal'],
    required: true
  },

  disease: {
    type: String,
    required: true
  },

  computingLayer: {
    type: String,
    enum: ['edge', 'fog', 'cloud'],
    default: 'cloud'
  },

  priorityScore: { type: Number, default: 0 },

  reason: { type: String },

  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  }
}, { timestamps: true });

appointmentSchema.index({ doctorId: 1, date: 1, priorityScore: -1 });
appointmentSchema.index({ conditionType: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
