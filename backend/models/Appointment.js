const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    date: { type: Date, required: true, index: true },
    time: { type: String, required: true },
    conditionType: {
      type: String,
      enum: ['critical', 'moderate', 'normal'],
      default: 'normal'
    },
    disease: {
      type: String,
      required: true,
      default: 'General Consultation'
    },
    computingLayer: {
      type: String,
      enum: ['edge', 'fog', 'cloud'],
      default: 'cloud'
    },
    priorityScore: { type: Number, default: 100 },
    reason: { type: String, default: '' },
    notes: { type: String, default: '' },
    diagnosis: { type: String, default: '' },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled'
    }
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, date: 1, time: 1 });
appointmentSchema.index({ patientId: 1, date: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ doctorId: 1, date: 1, priorityScore: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
