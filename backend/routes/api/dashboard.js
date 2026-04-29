const express = require('express');
const Account = require('../../models/Account');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { ensureDefaultGoals } = require('../../utils/defaultData');
const { serializeAccount, serializeGoal, serializeTransaction } = require('../../utils/serializers');
const { buildDailyReport } = require('../../utils/reports');

const router = express.Router();

router.use(ensureAuth);

router.get('/', wrap(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [accounts, monthlyIncome, monthlyExpense, recentTxs, goals, report] = await Promise.all([
    Account.find({ user: userId }).lean(),
    Transaction.aggregate([
      { $match: { user: userId, type: 'Income', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amountCents' } } },
    ]),
    Transaction.aggregate([
      { $match: { user: userId, type: 'Expense', date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amountCents' } } },
    ]),
    Transaction.find({ user: userId }).sort({ date: -1 }).limit(6).populate('account', 'name').lean(),
    Goal.find({ user: userId }).populate('account').lean(),
    buildDailyReport(req.user),
  ]);

  const totalBalanceCents = accounts.reduce((sum, account) => sum + account.balanceCents, 0);
  const monthlyIncomeCents = monthlyIncome[0]?.total || 0;
  const monthlyExpenseCents = monthlyExpense[0]?.total || 0;

  res.json({
    accounts: accounts.map(serializeAccount),
    totalBalanceCents,
    monthlyIncomeCents,
    monthlyExpenseCents,
    savingsRate: monthlyIncomeCents > 0 ? Math.max(0, Math.round(((monthlyIncomeCents - monthlyExpenseCents) / monthlyIncomeCents) * 100)) : 0,
    recentTransactions: recentTxs.map(tx => serializeTransaction(tx, req.user.currency)),
    goals: goals.map(serializeGoal),
    report,
  });
}));

router.get('/motivations', (req, res) => {
  res.json({
    motivations: [
      'Money gets calmer when every franc already has a job.',
      'The goal is not to spend nothing. The goal is to spend on purpose.',
      'Small leaks are easier to fix while they are still small.',
      'A good budget is a steering wheel, not a cage.',
      'If today was messy, use the data. Tomorrow can still be clean.',
      'Your future self benefits from boring consistency more than heroic sacrifice.',
      'Before buying, ask: will this still feel useful in one week?',
      'Savings grow fastest when transfers happen before temptation arrives.',
      'One reviewed expense is better than ten ignored regrets.',
      'Progress is not only more money. It is more clarity.',
      'Protect your Needs account like it pays the rent, because it does.',
      'Give your goals a percentage and they will stop waiting for leftovers.',
    ],
  });
});

router.get('/reports/daily', wrap(async (req, res) => {
  res.json({ report: await buildDailyReport(req.user) });
}));

router.post('/goals/ensure', wrap(async (req, res) => {
  await ensureDefaultGoals(req.user._id);
  res.json({ ok: true });
}));

module.exports = router;
