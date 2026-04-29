const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function sameOriginGuard(req, res, next) {
  if (!unsafeMethods.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  const expected = `${req.protocol}://${req.get('host')}`;

  if (origin && origin !== expected) {
    return res.status(403).json({ error: 'Cross-origin request blocked' });
  }

  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== expected) {
        return res.status(403).json({ error: 'Cross-origin request blocked' });
      }
    } catch (err) {
      return res.status(403).json({ error: 'Invalid request origin' });
    }
  }

  return next();
}

module.exports = sameOriginGuard;
