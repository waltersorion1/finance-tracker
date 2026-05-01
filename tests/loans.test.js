const test = require('node:test');
const assert = require('node:assert/strict');
const { applyRepayment, buildLoanSummary } = require('../backend/utils/loans');

test('buildLoanSummary counts overdue and due-soon loans', () => {
  const now = new Date('2026-05-01T00:00:00.000Z');
  const loans = [
    { principalCents: 50000, repaidCents: 10000, status: 'active', dueAt: '2026-04-20T00:00:00.000Z' },
    { principalCents: 70000, repaidCents: 10000, status: 'active', dueAt: '2026-05-05T00:00:00.000Z' },
    { principalCents: 90000, repaidCents: 90000, status: 'paid', dueAt: '2026-04-01T00:00:00.000Z' },
  ];

  const summary = buildLoanSummary(loans, { now, dueSoonDays: 7 });
  assert.equal(summary.debtOutstandingCents, 100000);
  assert.equal(summary.totalPrincipalCents, 210000);
  assert.equal(summary.totalRepaidCents, 110000);
  assert.equal(summary.activeCount, 2);
  assert.equal(summary.paidCount, 1);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.dueSoonCount, 1);
});

test('applyRepayment keeps loan active for partial repayment', () => {
  const result = applyRepayment({ principalCents: 100000, repaidCents: 25000 }, 30000, new Date('2026-05-01T00:00:00.000Z'));
  assert.equal(result.nextRepaidCents, 55000);
  assert.equal(result.status, 'active');
  assert.equal(result.closedAt, null);
});

test('applyRepayment marks loan paid for full repayment', () => {
  const paidAt = new Date('2026-05-03T00:00:00.000Z');
  const result = applyRepayment({ principalCents: 100000, repaidCents: 80000 }, 20000, paidAt);
  assert.equal(result.nextRepaidCents, 100000);
  assert.equal(result.status, 'paid');
  assert.equal(result.closedAt.toISOString(), paidAt.toISOString());
});

test('applyRepayment rejects overpayment', () => {
  assert.throws(
    () => applyRepayment({ principalCents: 100000, repaidCents: 90000 }, 12000),
    /Repayment exceeds remaining balance/,
  );
});
