const test = require('node:test');
const assert = require('node:assert/strict');
const { addFrequency, getPeriodBounds } = require('../backend/utils/periods');

test('addFrequency advances dates by selected cadence', () => {
  const base = new Date('2026-04-15T00:00:00.000Z');
  assert.equal(addFrequency(base, 'daily').toISOString(), '2026-04-16T00:00:00.000Z');
  assert.equal(addFrequency(base, 'weekly').toISOString(), '2026-04-22T00:00:00.000Z');
  assert.equal(addFrequency(base, 'monthly').toISOString(), '2026-05-15T00:00:00.000Z');
});

test('getPeriodBounds returns monthly bounds', () => {
  const { start, end } = getPeriodBounds('monthly', new Date('2026-04-15T12:00:00.000Z'));
  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 3);
  assert.equal(start.getDate(), 1);
  assert.equal(end.getMonth(), 3);
});

test('getPeriodBounds returns Monday-start weekly bounds', () => {
  const { start, end } = getPeriodBounds('weekly', new Date('2026-04-15T12:00:00.000Z'));
  assert.equal(start.getDay(), 1);
  assert.equal(end.getDay(), 0);
});
