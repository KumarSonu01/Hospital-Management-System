const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['consultation', 'medication', 'lab_test', 'room_charge', 'surgery', 'nursing', 'other'],
    default: 'consultation'
  },
  quantity: { type: Number, default: 1, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    items: [invoiceItemSchema],
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'partially_paid', 'cancelled', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'credit_card', 'insurance', 'upi', 'bank_transfer', 'none'],
      default: 'none'
    },
    dueDate: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    paidAt: { type: Date },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
