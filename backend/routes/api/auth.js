const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../../models/User');
const { ensureStarterData } = require('../../utils/defaultData');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { serializeUser } = require('../../utils/serializers');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function composeName(body) {
  const parts = [body.firstName, body.middleName, body.lastName].map(value => (value || '').trim()).filter(Boolean);
  return parts.join(' ') || (body.name || '').trim();
}

router.get('/me', (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

router.post('/register', authLimiter, [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 40 }),
  body('middleName').trim().isLength({ max: 40 }).optional({ checkFalsy: true }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 40 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phoneNumber').trim().isLength({ max: 30 }).optional({ checkFalsy: true }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const { email, password, firstName, middleName, lastName, phoneNumber } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: composeName(req.body),
    firstName,
    middleName,
    lastName,
    phoneNumber,
    email,
    password: hash,
  });

  await ensureStarterData(user._id);
  req.login(user, err => {
    if (err) return res.status(500).json({ error: 'Account created, but login failed.' });
    return res.status(201).json({ user: serializeUser(user) });
  });
}));

router.post('/login', authLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid email or password' });
    req.login(user, loginErr => {
      if (loginErr) return next(loginErr);
      return res.json({ user: serializeUser(user) });
    });
  })(req, res, next);
});

router.post('/logout', ensureAuth, (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

module.exports = router;
