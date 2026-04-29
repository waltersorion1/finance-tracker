const test = require('node:test');
const assert = require('node:assert/strict');
const { toCents, fromCents } = require('../backend/utils/money');

test('toCents converts decimal amounts safely', () => {
  assert.equal(toCents('10'), 1000);
  assert.equal(toCents('10.55'), 1055);
  assert.equal(toCents('0.01'), 1);
});

test('toCents returns zero for invalid values', () => {
  assert.equal(toCents('bad'), 0);
  assert.equal(toCents(undefined), 0);
});

test('fromCents rounds display units', () => {
  assert.equal(fromCents(1055), 11);
  assert.equal(fromCents(1000), 10);
});
