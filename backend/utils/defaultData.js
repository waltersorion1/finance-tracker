const Account = require('../models/Account');
const Goal = require('../models/Goal');

const defaultAccounts = [
  { name: 'Needs', type: 'core', percentage: 15, goalCents: 0 },
  { name: 'Wants', type: 'core', percentage: 5, goalCents: 0 },
  { name: 'Savings', type: 'core', percentage: 20, goalCents: 0 },
  { name: 'Investment Trust', type: 'core', percentage: 10, goalCents: 0 },
  { name: 'Emergency Funds', type: 'core', percentage: 12, goalCents: 0 },
  { name: 'Kids Funds', type: 'core', percentage: 15, goalCents: 0 },
  { name: 'Buy a Car', type: 'goal', percentage: 13, goalCents: 700000000 },
  { name: 'Rent Studio', type: 'goal', percentage: 10, goalCents: 70000000 },
];

const defaultGoals = [
  { name: 'Buy a Car', targetCents: 700000000, accountName: 'Buy a Car', percentage: 65, priority: 'high' },
  { name: 'Rent Studio', targetCents: 70000000, accountName: 'Rent Studio', percentage: 35, priority: 'high' },
];

async function ensureDefaultAccounts(userId) {
  const count = await Account.countDocuments({ user: userId });
  if (count > 0) return;
  await Account.insertMany(defaultAccounts.map(account => ({ user: userId, ...account })));
}

async function ensureDefaultGoals(userId) {
  const count = await Goal.countDocuments({ user: userId });
  if (count > 0) return;

  for (const goal of defaultGoals) {
    const account = await Account.findOne({ user: userId, name: goal.accountName });
    await Goal.create({
      user: userId,
      name: goal.name,
      targetCents: goal.targetCents,
      percentage: goal.percentage,
      priority: goal.priority,
      account: account?._id,
    });
  }
}

async function ensureStarterData(userId) {
  await ensureDefaultAccounts(userId);
  await ensureDefaultGoals(userId);
}

module.exports = {
  defaultAccounts,
  defaultGoals,
  ensureDefaultAccounts,
  ensureDefaultGoals,
  ensureStarterData,
};
