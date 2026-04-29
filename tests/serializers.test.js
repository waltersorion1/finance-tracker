const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeGoal } = require('../backend/utils/serializers');

test('serializeGoal includes remaining balance and ETA from current income split', () => {
  const goal = {
    _id: { toString: () => 'goal-1' },
    name: 'Buy a Car',
    targetCents: 700000000,
    percentage: 65,
    priority: 'high',
    account: {
      _id: { toString: () => 'account-1' },
      name: 'Buy a Car',
      type: 'goal',
      balanceCents: 100000000,
      percentage: 13,
      goalCents: 700000000,
    },
  };

  const serialized = serializeGoal(goal, { monthlyIncomeCents: 100000000 });
  assert.equal(serialized.remainingCents, 600000000);
  assert.equal(serialized.expectedMonthlyContributionCents, 13000000);
  assert.equal(serialized.estimatedMonths, 47);
});

test('serializeGoal leaves ETA null when no contribution data exists', () => {
  const goal = {
    _id: { toString: () => 'goal-1' },
    name: 'Rent Studio',
    targetCents: 70000000,
    account: null,
  };

  const serialized = serializeGoal(goal);
  assert.equal(serialized.estimatedMonths, null);
});
