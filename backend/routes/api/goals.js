const express = require('express');
const { body, validationResult } = require('express-validator');
const Account = require('../../models/Account');
const Goal = require('../../models/Goal');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { serializeGoal } = require('../../utils/serializers');
const { toCents } = require('../../utils/money');

const router = express.Router();
router.use(ensureAuth);

async function listGoals(userId) {
  const goals = await Goal.find({ user: userId }).sort({ createdAt: 1 }).populate('account').lean();
  return goals.map(serializeGoal);
}

router.get('/', wrap(async (req, res) => {
  res.json({ goals: await listGoals(req.user._id) });
}));

router.post('/', [
  body('name').trim().notEmpty().withMessage('Goal name is required').isLength({ max: 80 }),
  body('target').isFloat({ min: 1 }).withMessage('Target must be at least 1'),
  body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const percentage = Number(req.body.percentage);
  const existing = await Goal.find({ user: req.user._id }).lean();
  const total = Math.round((existing.reduce((sum, goal) => sum + (goal.percentage || 0), 0) + percentage) * 100) / 100;
  if (total > 100) return res.status(422).json({ error: `Goal allocation cannot exceed 100%. Current total would be ${total}%.` });

  const account = await Account.create({
    user: req.user._id,
    name: req.body.name,
    type: 'goal',
    percentage: 0,
    goalCents: toCents(req.body.target),
  });

  await Goal.create({
    user: req.user._id,
    name: req.body.name,
    targetCents: toCents(req.body.target),
    percentage,
    priority: req.body.priority || 'medium',
    deadline: req.body.deadline || null,
    notes: (req.body.notes || '').trim().slice(0, 300),
    account: account._id,
  });

  res.status(201).json({ goals: await listGoals(req.user._id) });
}));

router.put('/distribution', [
  body('goals').isArray().withMessage('Goals are required'),
  body('goals.*.id').isMongoId().withMessage('Invalid goal id'),
  body('goals.*.percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentages must be between 0 and 100'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const updates = req.body.goals.map(goal => ({ id: goal.id, percentage: Math.round(Number(goal.percentage) * 100) / 100 }));
  const total = Math.round(updates.reduce((sum, goal) => sum + goal.percentage, 0) * 100) / 100;
  if (updates.length && total !== 100) return res.status(422).json({ error: `Goal distribution must total 100%. Current total is ${total}%.` });

  const owned = await Goal.find({ user: req.user._id, _id: { $in: updates.map(goal => goal.id) } });
  if (owned.length !== updates.length) return res.status(404).json({ error: 'One or more goals were not found.' });

  for (const update of updates) {
    await Goal.updateOne({ _id: update.id, user: req.user._id }, { percentage: update.percentage });
  }
  res.json({ goals: await listGoals(req.user._id) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  if (goal.account) await Account.deleteOne({ _id: goal.account, user: req.user._id, type: 'goal' });
  await goal.deleteOne();
  res.json({ goals: await listGoals(req.user._id) });
}));

module.exports = router;
