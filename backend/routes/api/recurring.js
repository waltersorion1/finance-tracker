const express = require('express');
const { body, validationResult } = require('express-validator');
const Account = require('../../models/Account');
const RecurringTransaction = require('../../models/RecurringTransaction');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { toCents } = require('../../utils/money');
const { logAudit } = require('../../utils/audit');
const { processDueRecurringTransactions } = require('../../services/recurring');

const router = express.Router();
router.use(ensureAuth);

function serializeJob(job) {
  return {
    id: job._id.toString(),
    type: job.type,
    category: job.category,
    subcategory: job.subcategory || '',
    amountCents: job.amountCents,
    account: job.account ? { id: job.account._id.toString(), name: job.account.name } : null,
    frequency: job.frequency,
    nextRunAt: job.nextRunAt,
    lastRunAt: job.lastRunAt || null,
    reflection: job.reflection || '',
    active: job.active,
  };
}

router.get('/', wrap(async (req, res) => {
  const jobs = await RecurringTransaction.find({ user: req.user._id }).sort({ nextRunAt: 1 }).populate('account', 'name').lean();
  res.json({ recurring: jobs.map(serializeJob) });
}));

router.post('/', [
  body('type').isIn(['Income', 'Expense']).withMessage('Invalid transaction type'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 60 }),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
  body('nextRunAt').isISO8601().withMessage('Valid next run date is required'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  let account = null;
  if (req.body.type === 'Expense') {
    account = await Account.findOne({ _id: req.body.account, user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found.' });
  }

  const job = await RecurringTransaction.create({
    user: req.user._id,
    type: req.body.type,
    category: req.body.category.trim(),
    subcategory: (req.body.subcategory || '').trim(),
    amountCents: toCents(req.body.amount),
    account: account?._id,
    frequency: req.body.frequency,
    nextRunAt: new Date(req.body.nextRunAt),
    reflection: (req.body.reflection || '').trim().slice(0, 300),
  });

  await logAudit({
    user: req.user._id,
    action: 'recurring.create',
    entity: 'RecurringTransaction',
    entityId: job._id,
    metadata: { type: job.type, category: job.category, frequency: job.frequency },
  });

  const jobs = await RecurringTransaction.find({ user: req.user._id }).sort({ nextRunAt: 1 }).populate('account', 'name').lean();
  res.status(201).json({ recurring: jobs.map(serializeJob) });
}));

router.post('/run-due', wrap(async (req, res) => {
  const results = await processDueRecurringTransactions(req.user);
  res.json({ processed: results.length });
}));

router.delete('/:id', wrap(async (req, res) => {
  const job = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!job) return res.status(404).json({ error: 'Recurring transaction not found' });
  await logAudit({ user: req.user._id, action: 'recurring.delete', entity: 'RecurringTransaction', entityId: job._id });
  const jobs = await RecurringTransaction.find({ user: req.user._id }).sort({ nextRunAt: 1 }).populate('account', 'name').lean();
  res.json({ recurring: jobs.map(serializeJob) });
}));

module.exports = router;
