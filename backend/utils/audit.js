const AuditLog = require('../models/AuditLog');

async function logAudit({ user, action, entity, entityId, metadata = {} }) {
  try {
    await AuditLog.create({ user, action, entity, entityId, metadata });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
