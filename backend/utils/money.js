function toCents(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function fromCents(cents) {
  return Math.round((cents || 0) / 100);
}

module.exports = { toCents, fromCents };
