const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: 'System' },
    userRole: { type: String, default: 'system' },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN',
        'LOGOUT',
        'PATIENT_REGISTER',
        'PATIENT_UPDATE',
        'APPOINTMENT_CREATE',
        'APPOINTMENT_CANCEL',
        'APPOINTMENT_COMPLETE',
        'PRESCRIPTION_CREATE',
        'INVOICE_CREATE',
        'INVOICE_PAY',
        'INVENTORY_ADJUST',
        'INVENTORY_ADD',
        'BED_ASSIGN',
        'BED_DISCHARGE',
        'BED_STATUS_UPDATE',
        'ADMIN_CREATED',
        'ADMIN_PROFILE_UPDATE',
        'SYSTEM_SEED'
      ]
    },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    details: { type: String, default: '' },
    ipAddress: { type: String, default: '127.0.0.1' }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
