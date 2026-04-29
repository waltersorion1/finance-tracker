const express = require('express');
const { body, validationResult } = require('express-validator');
const Account = require('../../models/Account');
const Transaction = require('../../models/Transaction');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { serializeTransaction } = require('../../utils/serializers');
const { toCents } = require('../../utils/money');

const router = express.Router();
const fallbackOrder = ['Wants', 'Emergency Funds', 'Investment Trust', 'Savings', 'Kids Funds'];

router.use(ensureAuth);

router.get('/', wrap(async (req, res) => {
  const { type, category, from, to, page: rawPage } = req.query;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const perPage = 15;
  const filter = { user: req.user._id };
  if (['Income', 'Expense'].includes(type)) filter.type = type;
  if (category) filter.category = { $regex: new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(new Date(to).setHours(23, 59, 59));
  }

  const [total, transactions] = await Promise.all([
    Transaction.countDocuments(filter),
    Transaction.find(filter).sort({ date: -1 }).skip((page - 1) * perPage).limit(perPage).populate('account', 'name').lean(),
  ]);

  res.json({
    transactions: transactions.map(tx => serializeTransaction(tx, req.user.currency)),
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  });
}));

router.post('/', [
  body('type').isIn(['Income', 'Expense']).withMessage('Invalid transaction type'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 60 }),
  body('subcategory').trim().isLength({ max: 60 }).optional({ checkFalsy: true }),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const { type, category, subcategory, account: accountId } = req.body;
  const amountCents = toCents(req.body.amount);
  const userId = req.user._id;

  if (type === 'Income') {
    const accounts = await Account.find({ user: userId });
    const totalPct = accounts.reduce((sum, account) => sum + (account.percentage || 0), 0);
    let allocated = 0;
    for (const [index, account] of accounts.entries()) {
      const pct = totalPct > 0 ? (account.percentage || 0) / totalPct : 1 / accounts.length;
      const share = index === accounts.length - 1 ? amountCents - allocated : Math.floor(amountCents * pct);
      account.balanceCents += share;
      allocated += share;
      await account.save();
    }
    const tx = await Transaction.create({ user: userId, type, category, subcategory, amountCents, reflection: (req.body.reflection || '').trim().slice(0, 300) });
    return res.status(201).json({ transaction: serializeTransaction(await tx.populate('account'), req.user.currency) });
  }

  const allAccounts = await Account.find({ user: userId });
  const account = allAccounts.find(item => item._id.toString() === accountId);
  if (!account) return res.status(404).json({ error: 'Account not found.' });
  if (account.goalCents > 0 && account.balanceCents < account.goalCents) {
    return res.status(422).json({ error: `"${account.name}" is locked until its goal is reached.` });
  }

  let remaining = amountCents;
  let flag = null;
  if (account.balanceCents >= remaining) {
    if (remaining >= Math.floor(account.balanceCents * 0.1)) flag = 'high-spend';
    account.balanceCents -= remaining;
    await account.save();
    remaining = 0;
  } else {
    remaining -= account.balanceCents;
    account.balanceCents = 0;
    await account.save();
    flag = 'fallback-used';

    for (const fallbackName of fallbackOrder) {
      if (remaining <= 0) break;
      const fallback = allAccounts.find(item => item.name === fallbackName && item._id.toString() !== accountId);
      if (!fallback || fallback.balanceCents <= 0) continue;
      const pull = Math.min(remaining, fallback.balanceCents);
      fallback.balanceCents -= pull;
      remaining -= pull;
      await fallback.save();
    }
  }

  if (remaining > 0) return res.status(422).json({ error: 'Insufficient funds across all accounts.' });

  const tx = await Transaction.create({
    user: userId,
    type,
    category,
    subcategory,
    amountCents,
    account: account._id,
    reflection: (req.body.reflection || '').trim().slice(0, 300),
    flag,
  });
  res.status(201).json({ transaction: serializeTransaction(await tx.populate('account'), req.user.currency) });
}));

router.patch('/:id/reflection', [
  body('reflection').trim().isLength({ max: 300 }).withMessage('Reflection is too long'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });
  const tx = await Transaction.findOne({ _id: req.params.id, user: req.user._id }).populate('account', 'name');
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
  tx.reflection = (req.body.reflection || '').trim();
  await tx.save();
  res.json({ transaction: serializeTransaction(tx, req.user.currency) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
  res.json({ ok: true });
}));

router.get('/export.csv', wrap(async (req, res) => {
  const txs = await Transaction.find({ user: req.user._id }).sort({ date: -1 }).populate('account', 'name').lean();
  const rows = ['Date,Type,Category,Subcategory,Account,Amount,Reflection,Flag'];
  for (const tx of txs) {
    rows.push([
      new Date(tx.date).toISOString().slice(0, 10),
      tx.type,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      `"${(tx.subcategory || '').replace(/"/g, '""')}"`,
      `"${(tx.account?.name || '').replace(/"/g, '""')}"`,
      `${Math.round(tx.amountCents / 100)} ${req.user.currency}`,
      `"${(tx.reflection || '').replace(/"/g, '""')}"`,
      tx.flag || '',
    ].join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(rows.join('\n'));
}));

module.exports = router;
