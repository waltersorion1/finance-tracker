const express = require('express');
const { body, validationResult } = require('express-validator');
const Account = require('../../models/Account');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { serializeAccount } = require('../../utils/serializers');

const router = express.Router();
router.use(ensureAuth);

router.get('/', wrap(async (req, res) => {
  const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: 1 }).lean();
  res.json({ accounts: accounts.map(serializeAccount) });
}));

router.put('/distribution', [
  body('accounts').isArray({ min: 1 }).withMessage('Accounts are required'),
  body('accounts.*.id').isMongoId().withMessage('Invalid account id'),
  body('accounts.*.percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentages must be between 0 and 100'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const updates = req.body.accounts.map(account => ({
    id: account.id,
    percentage: Math.round(Number(account.percentage) * 100) / 100,
  }));
  const total = Math.round(updates.reduce((sum, account) => sum + account.percentage, 0) * 100) / 100;
  if (total !== 100) return res.status(422).json({ error: `Account distribution must total 100%. Current total is ${total}%.` });

  const owned = await Account.find({ user: req.user._id, _id: { $in: updates.map(account => account.id) } });
  if (owned.length !== updates.length) return res.status(404).json({ error: 'One or more accounts were not found.' });

  for (const update of updates) {
    await Account.updateOne({ _id: update.id, user: req.user._id }, { percentage: update.percentage });
  }

  const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: 1 }).lean();
  res.json({ accounts: accounts.map(serializeAccount) });
}));

module.exports = router;
