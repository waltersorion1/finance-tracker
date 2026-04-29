const express = require('express');
const passport = require('passport');
const { ensureStarterData } = require('../utils/defaultData');
const { wrap } = require('../middleware/auth');

const router = express.Router();

function googleEnabled(req, res, next) {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) return next();
  return res.redirect('/login?error=google-disabled');
}

router.get('/auth/google', googleEnabled, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
  googleEnabled,
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  wrap(async (req, res) => {
    await ensureStarterData(req.user._id);
    res.redirect('/dashboard');
  })
);

module.exports = router;
