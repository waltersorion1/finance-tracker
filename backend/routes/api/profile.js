const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Account = require('../../models/Account');
const AuditLog = require('../../models/AuditLog');
const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');
const RecurringTransaction = require('../../models/RecurringTransaction');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { serializeUser } = require('../../utils/serializers');
const { logAudit } = require('../../utils/audit');

const router = express.Router();
router.use(ensureAuth);

router.put('/', [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 40 }),
  body('middleName').trim().isLength({ max: 40 }).optional({ checkFalsy: true }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 40 }),
  body('phoneNumber').trim().isLength({ max: 30 }).optional({ checkFalsy: true }),
  body('profilePicture').trim().isLength({ max: 500 }).optional({ checkFalsy: true }),
  body('bio').trim().isLength({ max: 280 }).optional({ checkFalsy: true }),
  body('language').isIn(['en', 'fr']).withMessage('Invalid language'),
  body('theme').isIn(['light', 'dark']).withMessage('Invalid theme'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const fields = ['firstName', 'middleName', 'lastName', 'phoneNumber', 'profilePicture', 'bio', 'language', 'theme'];
  const update = {};
  for (const field of fields) update[field] = (req.body[field] || '').trim();
  update.name = [update.firstName, update.middleName, update.lastName].filter(Boolean).join(' ');

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  res.json({ user: serializeUser(user) });
}));

router.patch('/theme', [
  body('theme').isIn(['light', 'dark']).withMessage('Invalid theme'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const user = await User.findByIdAndUpdate(req.user._id, { theme: req.body.theme }, { new: true });
  res.json({ user: serializeUser(user) });
}));

router.put('/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) throw new Error('Passwords do not match');
    return true;
  }),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const user = await User.findById(req.user._id);
  if (!user.password) return res.status(422).json({ error: 'Password changes are only available for local accounts.' });

  const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });

  user.password = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  await logAudit({ user: user._id, action: 'profile.password_change', entity: 'User', entityId: user._id });
  res.json({ ok: true });
}));

router.get('/export', wrap(async (req, res) => {
  const userId = req.user._id;
  const [user, accounts, goals, transactions, budgets, recurring, audit] = await Promise.all([
    User.findById(userId).lean(),
    Account.find({ user: userId }).lean(),
    Goal.find({ user: userId }).lean(),
    Transaction.find({ user: userId }).lean(),
    Budget.find({ user: userId }).lean(),
    RecurringTransaction.find({ user: userId }).lean(),
    AuditLog.find({ user: userId }).sort({ createdAt: -1 }).lean(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: serializeUser(user),
    accounts,
    goals,
    transactions,
    budgets,
    recurring,
    audit,
  };

  await logAudit({ user: userId, action: 'profile.export', entity: 'User', entityId: userId });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="finance-tracker-export.json"');
  res.send(JSON.stringify(payload, null, 2));
}));

router.delete('/', [
  body('confirm').equals('DELETE').withMessage('Type DELETE to confirm account deletion'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const userId = req.user._id;
  await Promise.all([
    Account.deleteMany({ user: userId }),
    Goal.deleteMany({ user: userId }),
    Transaction.deleteMany({ user: userId }),
    Budget.deleteMany({ user: userId }),
    RecurringTransaction.deleteMany({ user: userId }),
    AuditLog.deleteMany({ user: userId }),
  ]);
  await User.deleteOne({ _id: userId });

  req.logout(err => {
    if (err) return res.status(500).json({ error: 'Account deleted, but logout failed.' });
    req.session.destroy(() => res.json({ ok: true }));
  });
}));

module.exports = router;
