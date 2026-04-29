const express = require('express');
const Budget = require('../../models/Budget');
const Goal = require('../../models/Goal');
const Transaction = require('../../models/Transaction');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { getPeriodBounds } = require('../../utils/periods');
const { serializeGoal } = require('../../utils/serializers');

const router = express.Router();
router.use(ensureAuth);

function monthBounds(rawMonth) {
  if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
    const [year, month] = rawMonth.split('-').map(Number);
    return {
      label: rawMonth,
      start: new Date(year, month - 1, 1, 0, 0, 0, 0),
      end: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }
  const now = new Date();
  const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    label,
    start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

async function sumTransactions(userId, match) {
  const result = await Transaction.aggregate([
    { $match: { user: userId, ...match } },
    { $group: { _id: null, total: { $sum: '$amountCents' }, count: { $sum: 1 } } },
  ]);
  return { totalCents: result[0]?.total || 0, count: result[0]?.count || 0 };
}

router.get('/monthly', wrap(async (req, res) => {
  const { label, start, end } = monthBounds(req.query.month);
  const userId = req.user._id;

  const [income, expenses, unnecessary, highSpends, topCategories, goals, budgets] = await Promise.all([
    sumTransactions(userId, { type: 'Income', date: { $gte: start, $lte: end } }),
    sumTransactions(userId, { type: 'Expense', date: { $gte: start, $lte: end } }),
    sumTransactions(userId, { type: 'Expense', isNecessary: false, date: { $gte: start, $lte: end } }),
    Transaction.find({ user: userId, type: 'Expense', flag: { $in: ['high-spend', 'fallback-used'] }, date: { $gte: start, $lte: end } })
      .sort({ amountCents: -1 })
      .limit(5)
      .populate('account', 'name')
      .lean(),
    Transaction.aggregate([
      { $match: { user: userId, type: 'Expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
      { $sort: { totalCents: -1 } },
      { $limit: 6 },
    ]),
    Goal.find({ user: userId }).populate('account').lean(),
    Budget.find({ user: userId, active: true }).lean(),
  ]);

  const budgetStatus = [];
  for (const budget of budgets) {
    const bounds = getPeriodBounds(budget.period, start);
    const spent = await sumTransactions(userId, {
      type: 'Expense',
      category: budget.category,
      date: { $gte: bounds.start, $lte: bounds.end },
    });
    const pct = budget.limitCents > 0 ? Math.round((spent.totalCents / budget.limitCents) * 100) : 0;
    budgetStatus.push({
      id: budget._id.toString(),
      category: budget.category,
      period: budget.period,
      limitCents: budget.limitCents,
      spentCents: spent.totalCents,
      pct,
      status: pct >= 100 ? 'over' : pct >= budget.alertThreshold ? 'warning' : 'ok',
    });
  }

  const netCents = income.totalCents - expenses.totalCents;
  const savingsRate = income.totalCents > 0 ? Math.round((netCents / income.totalCents) * 100) : 0;
  const advice = [];
  if (savingsRate >= 30) advice.push('Strong savings month. Keep the allocation system boring and consistent.');
  else if (savingsRate >= 10) advice.push('Positive month, but there is room to tighten discretionary spending.');
  else if (income.totalCents > 0) advice.push('Savings rate is thin this month. Review top categories before adding new commitments.');
  else advice.push('No income recorded for this month yet. Add income to make the review useful.');
  if (unnecessary.totalCents > 0) advice.push('Unnecessary spending was tagged this month. Use those entries as your easiest cleanup list.');
  if (budgetStatus.some(budget => budget.status === 'over')) advice.push('At least one budget is over limit. Start next month by lowering that category early.');
  if (highSpends.length) advice.push('High-spend or fallback transactions appeared this month. Review them before they become normal.');

  res.json({
    review: {
      month: label,
      incomeCents: income.totalCents,
      expenseCents: expenses.totalCents,
      netCents,
      savingsRate,
      transactionCount: income.count + expenses.count,
      unnecessarySpendCents: unnecessary.totalCents,
      unnecessaryCount: unnecessary.count,
      topCategories: topCategories.map(item => ({ category: item._id || 'Other', totalCents: item.totalCents, count: item.count })),
      highSpends: highSpends.map(tx => ({
        id: tx._id.toString(),
        date: tx.date,
        category: tx.category,
        amountCents: tx.amountCents,
        accountName: tx.account?.name || 'General',
        flag: tx.flag || '',
      })),
      budgets: budgetStatus,
      goals: goals.map(goal => serializeGoal(goal, { monthlyIncomeCents: income.totalCents })),
      advice,
    },
  });
}));

module.exports = router;
