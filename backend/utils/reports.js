const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { fromCents } = require('./money');

const discretionaryCategories = ['Entertainment', 'Shopping', 'Eating Out', 'Subscriptions', 'Gift', 'Travel'];

function dayBounds(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return { start, end };
}

async function buildDailyReport(user) {
  const { start, end } = dayBounds();
  const [transactions, accounts] = await Promise.all([
    Transaction.find({ user: user._id, date: { $gte: start, $lte: end } }).populate('account', 'name').lean(),
    Account.find({ user: user._id }).lean(),
  ]);

  const incomeCents = transactions.filter(tx => tx.type === 'Income').reduce((sum, tx) => sum + tx.amountCents, 0);
  const expenseTxs = transactions.filter(tx => tx.type === 'Expense');
  const expenseCents = expenseTxs.reduce((sum, tx) => sum + tx.amountCents, 0);
  const byCategory = new Map();

  for (const tx of expenseTxs) {
    byCategory.set(tx.category, (byCategory.get(tx.category) || 0) + tx.amountCents);
  }

  const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  const highSpends = expenseTxs.filter(tx => tx.flag === 'high-spend' || tx.amountCents >= 2500000);
  const discretionary = expenseTxs.filter(tx => discretionaryCategories.includes(tx.category));
  const lowAccounts = accounts.filter(account => account.balanceCents > 0 && account.balanceCents < 1000000);

  const advice = [];
  if (expenseCents === 0 && incomeCents === 0) {
    advice.push('No movement today. A quiet money day is useful if it was intentional.');
  }
  if (incomeCents > 0 && expenseCents === 0) {
    advice.push('Income landed today and no expenses followed it. Strong day for keeping the plan intact.');
  }
  if (expenseCents > incomeCents && incomeCents > 0) {
    advice.push('Today spent more than it earned. Check whether this was planned or a leak to tighten tomorrow.');
  }
  if (topCategory) {
    advice.push(`${topCategory[0]} took the biggest share today at ${fromCents(topCategory[1]).toLocaleString()} ${user.currency}.`);
  }
  if (highSpends.length) {
    advice.push(`${highSpends.length} high-spend transaction${highSpends.length > 1 ? 's' : ''} deserve${highSpends.length > 1 ? '' : 's'} a quick review.`);
  }
  if (discretionary.length) {
    const total = discretionary.reduce((sum, tx) => sum + tx.amountCents, 0);
    advice.push(`Discretionary spending reached ${fromCents(total).toLocaleString()} ${user.currency}; keep only what still feels worth it tomorrow.`);
  }
  if (lowAccounts.length) {
    advice.push(`${lowAccounts.map(account => account.name).join(', ')} ${lowAccounts.length === 1 ? 'is' : 'are'} running low.`);
  }
  if (!advice.length) {
    advice.push('Your spending stayed balanced today. Keep tomorrow simple and intentional.');
  }

  return {
    date: start.toISOString().slice(0, 10),
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    transactionCount: transactions.length,
    highSpends,
    categories: [...byCategory.entries()].map(([category, totalCents]) => ({ category, totalCents })),
    advice,
  };
}

module.exports = { buildDailyReport };
