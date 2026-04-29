const express = require('express');
const AuditLog = require('../../models/AuditLog');
const { ensureAuth, wrap } = require('../../middleware/auth');

const router = express.Router();
router.use(ensureAuth);

router.get('/', wrap(async (req, res) => {
  const logs = await AuditLog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({
    audit: logs.map(log => ({
      id: log._id.toString(),
      action: log.action,
      entity: log.entity,
      entityId: log.entityId || null,
      metadata: log.metadata || {},
      createdAt: log.createdAt,
    })),
  });
}));

module.exports = router;
