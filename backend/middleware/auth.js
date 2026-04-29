function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { ensureAuth, wrap };
