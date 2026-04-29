function serializeUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    phoneNumber: user.phoneNumber || '',
    profilePicture: user.profilePicture || '',
    bio: user.bio || '',
    email: user.email,
    currency: user.currency || 'XAF',
    language: user.language || 'en',
    theme: user.theme || 'light',
    registeredVia: user.registeredVia || 'local',
  };
}

function serializeAccount(account) {
  return {
    id: account._id.toString(),
    name: account.name,
    type: account.type,
    balanceCents: account.balanceCents || 0,
    percentage: account.percentage || 0,
    goalCents: account.goalCents || 0,
  };
}

function serializeGoal(goal, options = {}) {
  const account = goal.account || null;
  const balanceCents = account?.balanceCents || 0;
  const pct = goal.targetCents > 0 ? Math.min(Math.round((balanceCents / goal.targetCents) * 100), 100) : 0;
  const monthlyIncomeCents = options.monthlyIncomeCents || 0;
  const accountPercentage = account?.percentage || 0;
  const expectedMonthlyContributionCents = Math.floor(monthlyIncomeCents * (accountPercentage / 100));
  const remainingCents = Math.max(0, goal.targetCents - balanceCents);
  const estimatedMonths = expectedMonthlyContributionCents > 0
    ? Math.ceil(remainingCents / expectedMonthlyContributionCents)
    : null;
  return {
    id: goal._id.toString(),
    name: goal.name,
    targetCents: goal.targetCents,
    percentage: goal.percentage || 0,
    priority: goal.priority || 'medium',
    deadline: goal.deadline || null,
    notes: goal.notes || '',
    account: account ? serializeAccount(account) : null,
    balanceCents,
    remainingCents,
    pct,
    expectedMonthlyContributionCents,
    estimatedMonths,
  };
}

function serializeTransaction(tx, currency = 'XAF') {
  return {
    id: tx._id.toString(),
    date: tx.date,
    type: tx.type,
    category: tx.category,
    subcategory: tx.subcategory || '',
    amountCents: tx.amountCents,
    account: tx.account ? { id: tx.account._id.toString(), name: tx.account.name } : null,
    accountName: tx.account?.name || 'General',
    reflection: tx.reflection || '',
    isNecessary: tx.isNecessary,
    flag: tx.flag || '',
    displayAmount: `${Math.round(tx.amountCents / 100).toLocaleString()} ${currency}`,
  };
}

module.exports = { serializeUser, serializeAccount, serializeGoal, serializeTransaction };
