const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medication: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, default: '7 days' },
  instructions: { type: String, default: 'Take with food' }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    medication: { type: String }, // For single-item legacy compatibility
    dosage: { type: String },
    frequency: { type: String },
    items: [prescriptionItemSchema],
    diagnosis: { type: String, default: 'Clinical Observation' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'dispensed', 'discontinued'], default: 'active' }
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ doctorId: 1, createdAt: -1 });

// Ensure single-item legacy fields populate items if items array is empty
prescriptionSchema.pre('save', function (next) {
  if ((!this.items || this.items.length === 0) && this.medication) {
    this.items = [{
      medication: this.medication,
      dosage: this.dosage || '1 tablet',
      frequency: this.frequency || 'Once daily',
      duration: '7 days',
      instructions: 'As directed'
    }];
  } else if (this.items && this.items.length > 0 && !this.medication) {
    this.medication = this.items[0].medication;
    this.dosage = this.items[0].dosage;
    this.frequency = this.items[0].frequency;
  }
  next();
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;
