const express = require('express');
const { body, validationResult } = require('express-validator');
const Budget = require('../../models/Budget');
const Transaction = require('../../models/Transaction');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { toCents } = require('../../utils/money');
const { getPeriodBounds } = require('../../utils/periods');
const { logAudit } = require('../../utils/audit');

const router = express.Router();
router.use(ensureAuth);

async function budgetWithSpend(budget) {
  const { start, end } = getPeriodBounds(budget.period);
  const spent = await Transaction.aggregate([
    {
      $match: {
        user: budget.user,
        type: 'Expense',
        category: budget.category,
        date: { $gte: start, $lte: end },
      },
    },
    { $group: { _id: null, total: { $sum: '$amountCents' } } },
  ]);
  const spentCents = spent[0]?.total || 0;
  const pct = budget.limitCents > 0 ? Math.round((spentCents / budget.limitCents) * 100) : 0;
  return {
    id: budget._id.toString(),
    category: budget.category,
    limitCents: budget.limitCents,
    period: budget.period,
    alertThreshold: budget.alertThreshold,
    active: budget.active,
    spentCents,
    remainingCents: budget.limitCents - spentCents,
    pct,
    status: pct >= 100 ? 'over' : pct >= budget.alertThreshold ? 'warning' : 'ok',
  };
}

router.get('/', wrap(async (req, res) => {
  const budgets = await Budget.find({ user: req.user._id }).sort({ category: 1 }).lean();
  res.json({ budgets: await Promise.all(budgets.map(budgetWithSpend)) });
}));

router.post('/', [
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 60 }),
  body('limit').isFloat({ min: 1 }).withMessage('Limit must be at least 1'),
  body('period').optional().isIn(['weekly', 'monthly']).withMessage('Invalid period'),
  body('alertThreshold').optional().isFloat({ min: 1, max: 100 }).withMessage('Alert threshold must be 1-100'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const update = {
    limitCents: toCents(req.body.limit),
    period: req.body.period || 'monthly',
    alertThreshold: Math.round(Number(req.body.alertThreshold || 80)),
    active: true,
  };
  const budget = await Budget.findOneAndUpdate(
    { user: req.user._id, category: req.body.category.trim(), period: update.period },
    { $set: { ...update, category: req.body.category.trim() } },
    { upsert: true, new: true, runValidators: true },
  );

  await logAudit({
    user: req.user._id,
    action: 'budget.upsert',
    entity: 'Budget',
    entityId: budget._id,
    metadata: { category: budget.category, limitCents: budget.limitCents, period: budget.period },
  });

  const budgets = await Budget.find({ user: req.user._id }).sort({ category: 1 }).lean();
  res.status(201).json({ budgets: await Promise.all(budgets.map(budgetWithSpend)) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!budget) return res.status(404).json({ error: 'Budget not found' });
  await logAudit({ user: req.user._id, action: 'budget.delete', entity: 'Budget', entityId: budget._id });
  const budgets = await Budget.find({ user: req.user._id }).sort({ category: 1 }).lean();
  res.json({ budgets: await Promise.all(budgets.map(budgetWithSpend)) });
}));

module.exports = router;
