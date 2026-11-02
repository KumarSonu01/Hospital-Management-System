const AuditLog = require('../models/AuditLog');

async function logActivity({ userId, userName, userRole, action, resourceType, resourceId, details, ipAddress }) {
  try {
    await AuditLog.create({
      userId,
      userName: userName || 'System User',
      userRole: userRole || 'system',
      action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : undefined,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ipAddress: ipAddress || '127.0.0.1'
    });
  } catch (err) {
    console.error('[AuditLog Error]', err.message);
  }
}

module.exports = { logActivity };
