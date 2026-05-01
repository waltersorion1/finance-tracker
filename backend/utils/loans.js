const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildLoanSummary(loans, options = {}) {
  const now = toDate(options.now) || new Date();
  const dueSoonDays = Number.isFinite(options.dueSoonDays) ? options.dueSoonDays : 7;
  const dueSoonCutoff = new Date(now.getTime() + (dueSoonDays * DAY_MS));

  let debtOutstandingCents = 0;
  let totalPrincipalCents = 0;
  let totalRepaidCents = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let activeCount = 0;
  let paidCount = 0;

  for (const loan of loans) {
    const principalCents = loan.principalCents || 0;
    const repaidCents = loan.repaidCents || 0;
    const remainingCents = Math.max(0, principalCents - repaidCents);
    const dueAt = toDate(loan.dueAt);

    totalPrincipalCents += principalCents;
    totalRepaidCents += repaidCents;

    if (loan.status === 'paid') paidCount += 1;
    if (loan.status !== 'active') continue;

    activeCount += 1;
    debtOutstandingCents += remainingCents;
    if (!dueAt || remainingCents <= 0) continue;
    if (dueAt < now) {
      overdueCount += 1;
      continue;
    }
    if (dueAt <= dueSoonCutoff) dueSoonCount += 1;
  }

  return {
    debtOutstandingCents,
    totalPrincipalCents,
    totalRepaidCents,
    activeCount,
    paidCount,
    overdueCount,
    dueSoonCount,
  };
}

function applyRepayment(loan, amountCents, repaymentDate = new Date()) {
  const amount = Number(amountCents);
  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Repayment amount must be greater than zero.');
    error.status = 422;
    throw error;
  }

  const remainingCents = Math.max(0, (loan.principalCents || 0) - (loan.repaidCents || 0));
  if (amount > remainingCents) {
    const error = new Error('Repayment exceeds remaining balance.');
    error.status = 422;
    throw error;
  }

  const nextRepaidCents = (loan.repaidCents || 0) + amount;
  const isPaid = nextRepaidCents >= (loan.principalCents || 0);

  return {
    nextRepaidCents,
    status: isPaid ? 'paid' : 'active',
    closedAt: isPaid ? toDate(repaymentDate) || new Date() : null,
  };
}

module.exports = { applyRepayment, buildLoanSummary };
