const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { logAudit } = require('../utils/audit');

const fallbackOrder = ['Wants', 'Emergency Funds', 'Investment Trust', 'Savings', 'Kids Funds'];

async function recordIncome({ user, category, subcategory, amountCents, reflection = '' }) {
  const accounts = await Account.find({ user: user._id });
  const totalPct = accounts.reduce((sum, account) => sum + (account.percentage || 0), 0);
  let allocated = 0;

  for (const [index, account] of accounts.entries()) {
    const pct = totalPct > 0 ? (account.percentage || 0) / totalPct : 1 / accounts.length;
    const share = index === accounts.length - 1 ? amountCents - allocated : Math.floor(amountCents * pct);
    account.balanceCents += share;
    allocated += share;
    await account.save();
  }

  const transaction = await Transaction.create({
    user: user._id,
    type: 'Income',
    category,
    subcategory,
    amountCents,
    reflection,
  });

  await logAudit({
    user: user._id,
    action: 'transaction.create',
    entity: 'Transaction',
    entityId: transaction._id,
    metadata: { type: 'Income', amountCents, category },
  });

  return transaction.populate('account');
}

async function recordExpense({ user, category, subcategory, amountCents, accountId, reflection = '', isNecessary = null }) {
  const allAccounts = await Account.find({ user: user._id });
  const account = allAccounts.find(item => item._id.toString() === accountId);
  if (!account) {
    const error = new Error('Account not found.');
    error.status = 404;
    throw error;
  }
  if (account.goalCents > 0 && account.balanceCents < account.goalCents) {
    const error = new Error(`"${account.name}" is locked until its goal is reached.`);
    error.status = 422;
    throw error;
  }

  let remaining = amountCents;
  let flag = null;
  if (account.balanceCents >= remaining) {
    if (remaining >= Math.floor(account.balanceCents * 0.1)) flag = 'high-spend';
    account.balanceCents -= remaining;
    await account.save();
    remaining = 0;
  } else {
    remaining -= account.balanceCents;
    account.balanceCents = 0;
    await account.save();
    flag = 'fallback-used';

    for (const fallbackName of fallbackOrder) {
      if (remaining <= 0) break;
      const fallback = allAccounts.find(item => item.name === fallbackName && item._id.toString() !== accountId);
      if (!fallback || fallback.balanceCents <= 0) continue;
      const pull = Math.min(remaining, fallback.balanceCents);
      fallback.balanceCents -= pull;
      remaining -= pull;
      await fallback.save();
    }
  }

  if (remaining > 0) {
    const error = new Error('Insufficient funds across all accounts.');
    error.status = 422;
    throw error;
  }

  const transaction = await Transaction.create({
    user: user._id,
    type: 'Expense',
    category,
    subcategory,
    amountCents,
    account: account._id,
    reflection,
    flag,
    isNecessary,
  });

  await logAudit({
    user: user._id,
    action: 'transaction.create',
    entity: 'Transaction',
    entityId: transaction._id,
    metadata: { type: 'Expense', amountCents, category, account: account.name, flag, isNecessary },
  });

  return transaction.populate('account');
}

async function recordTransaction(params) {
  if (params.type === 'Income') return recordIncome(params);
  return recordExpense(params);
}

module.exports = { recordTransaction, recordIncome, recordExpense };
