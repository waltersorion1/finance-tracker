const express = require('express');
const Account = require('../../models/Account');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const { ensureAuth, wrap } = require('../../middleware/auth');

const router = express.Router();
router.use(ensureAuth);

router.get('/', wrap(async (req, res) => {
  const userId = req.user._id;
  const months = [];
  const incomeData = [];
  const expenseData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const [inc, exp] = await Promise.all([
      Transaction.aggregate([{ $match: { user: userId, type: 'Income', date: { $gte: start, $lte: end } } }, { $group: { _id: null, t: { $sum: '$amountCents' } } }]),
      Transaction.aggregate([{ $match: { user: userId, type: 'Expense', date: { $gte: start, $lte: end } } }, { $group: { _id: null, t: { $sum: '$amountCents' } } }]),
    ]);
    months.push(label);
    incomeData.push(Math.round((inc[0]?.t || 0) / 100));
    expenseData.push(Math.round((exp[0]?.t || 0) / 100));
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const catBreakdown = await Transaction.aggregate([
    { $match: { user: userId, type: 'Expense', date: { $gte: monthStart } } },
    { $group: { _id: '$category', total: { $sum: '$amountCents' } } },
    { $sort: { total: -1 } },
  ]);

  const weeklyLabels = [];
  const weeklyIncome = [];
  const weeklyExpense = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
    const label = day.toLocaleString('default', { weekday: 'short' });
    const [inc, exp] = await Promise.all([
      Transaction.aggregate([{ $match: { user: userId, type: 'Income', date: { $gte: start, $lte: end } } }, { $group: { _id: null, t: { $sum: '$amountCents' } } }]),
      Transaction.aggregate([{ $match: { user: userId, type: 'Expense', date: { $gte: start, $lte: end } } }, { $group: { _id: null, t: { $sum: '$amountCents' } } }]),
    ]);
    weeklyLabels.push(label);
    weeklyIncome.push(Math.round((inc[0]?.t || 0) / 100));
    weeklyExpense.push(Math.round((exp[0]?.t || 0) / 100));
  }

  const [accounts, goals] = await Promise.all([
    Account.find({ user: userId }).lean(),
    Goal.find({ user: userId }).populate('account').lean(),
  ]);

  res.json({
    monthly: { labels: months, incomeData, expenseData },
    weekly: { labels: weeklyLabels, incomeData: weeklyIncome, expenseData: weeklyExpense },
    categories: {
      labels: catBreakdown.map(item => item._id || 'Other'),
      data: catBreakdown.map(item => Math.round(item.total / 100)),
    },
    accounts: {
      labels: accounts.map(account => account.name),
      data: accounts.map(account => Math.round(account.balanceCents / 100)),
      percentages: accounts.map(account => account.percentage || 0),
    },
    goals: {
      labels: goals.map(goal => goal.name),
      data: goals.map(goal => Math.round((goal.account?.balanceCents || 0) / 100)),
      targets: goals.map(goal => Math.round(goal.targetCents / 100)),
    },
  });
}));

module.exports = router;
