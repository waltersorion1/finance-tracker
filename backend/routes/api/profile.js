const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../../models/User');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { serializeUser } = require('../../utils/serializers');

const router = express.Router();
router.use(ensureAuth);

router.put('/', [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 40 }),
  body('middleName').trim().isLength({ max: 40 }).optional({ checkFalsy: true }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 40 }),
  body('phoneNumber').trim().isLength({ max: 30 }).optional({ checkFalsy: true }),
  body('profilePicture').trim().isLength({ max: 500 }).optional({ checkFalsy: true }),
  body('bio').trim().isLength({ max: 280 }).optional({ checkFalsy: true }),
  body('language').isIn(['en', 'fr']).withMessage('Invalid language'),
  body('theme').isIn(['light', 'dark']).withMessage('Invalid theme'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const fields = ['firstName', 'middleName', 'lastName', 'phoneNumber', 'profilePicture', 'bio', 'language', 'theme'];
  const update = {};
  for (const field of fields) update[field] = (req.body[field] || '').trim();
  update.name = [update.firstName, update.middleName, update.lastName].filter(Boolean).join(' ');

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
  res.json({ user: serializeUser(user) });
}));

module.exports = router;
