const express = require('express');
const { body, validationResult } = require('express-validator');
const Loan = require('../../models/Loan');
const { ensureAuth, wrap } = require('../../middleware/auth');
const { toCents } = require('../../utils/money');
const { logAudit } = require('../../utils/audit');
const { applyRepayment, buildLoanSummary } = require('../../utils/loans');
const { serializeLoan } = require('../../utils/serializers');

const router = express.Router();
router.use(ensureAuth);

router.get('/', wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const { status, from, to, page: rawPage, perPage: rawPerPage } = req.query;
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(rawPerPage, 10) || 12));
  const filter = { user: req.user._id, type: 'borrowed' };
  if (status && ['active', 'paid', 'defaulted', 'cancelled'].includes(status)) filter.status = status;
  if (from || to) {
    filter.issuedAt = {};
    if (from) filter.issuedAt.$gte = new Date(from);
    if (to) filter.issuedAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }

  const [rawLoans, allLoans] = await Promise.all([
    Loan.find(filter).lean(),
    Loan.find({ user: req.user._id, type: 'borrowed' }).lean(),
  ]);

  const now = new Date();
  const dueSoonMs = 7 * 24 * 60 * 60 * 1000;

  function urgencyRank(loan) {
    if (loan.status !== 'active') return 3;
    if (loan.dueAt && loan.dueAt < now) return 0;                          // overdue
    if (loan.dueAt && (loan.dueAt - now) <= dueSoonMs) return 1;           // due soon
    return 2;                                                               // normal active
  }

  rawLoans.sort((a, b) => {
    const rankDiff = urgencyRank(a) - urgencyRank(b);
    if (rankDiff !== 0) return rankDiff;
    // within same urgency: earlier dueAt first, then newest issuedAt first
    if (a.dueAt && b.dueAt) return new Date(a.dueAt) - new Date(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return new Date(b.issuedAt) - new Date(a.issuedAt);
  });

  const total = rawLoans.length;
  const loans = rawLoans.slice((page - 1) * perPage, page * perPage);

  res.json({
    loans: loans.map(loan => serializeLoan(loan, req.user.currency)),
    summary: buildLoanSummary(allLoans),
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  });
}));

router.post('/', [
  body('counterparty').trim().notEmpty().withMessage('Counterparty is required').isLength({ max: 80 }),
  body('principal').isFloat({ min: 1 }).withMessage('Principal must be at least 1'),
  body('interestRate').optional({ checkFalsy: true }).isFloat({ min: 0, max: 300 }).withMessage('Interest rate must be between 0 and 300'),
  body('issuedAt').optional({ checkFalsy: true }).isISO8601().withMessage('Issued date is invalid'),
  body('dueAt').optional({ checkFalsy: true }).isISO8601().withMessage('Due date is invalid'),
  body('purpose').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 400 }),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const issuedAt = req.body.issuedAt ? new Date(req.body.issuedAt) : new Date();
  const dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  if (dueAt && dueAt < issuedAt) return res.status(422).json({ error: 'Due date cannot be earlier than issued date.' });

  const loan = await Loan.create({
    user: req.user._id,
    type: 'borrowed',
    counterparty: req.body.counterparty.trim(),
    principalCents: toCents(req.body.principal),
    issuedAt,
    dueAt,
    interestRate: Number(req.body.interestRate || 0),
    purpose: (req.body.purpose || '').trim().slice(0, 200),
    notes: (req.body.notes || '').trim().slice(0, 400),
  });

  await logAudit({
    user: req.user._id,
    action: 'loan.create',
    entity: 'Loan',
    entityId: loan._id,
    metadata: { principalCents: loan.principalCents, counterparty: loan.counterparty },
  });

  res.status(201).json({ loan: serializeLoan(loan.toObject(), req.user.currency) });
}));

router.post('/:id/repayments', [
  body('amount').isFloat({ min: 1 }).withMessage('Repayment amount must be at least 1'),
  body('date').optional({ checkFalsy: true }).isISO8601().withMessage('Repayment date is invalid'),
  body('method').optional({ checkFalsy: true }).isIn(['cash', 'transfer', 'mobile-money', 'card', 'other']).withMessage('Invalid repayment method'),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Repayment note is too long'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
  if (!loan) return res.status(404).json({ error: 'Loan not found.' });
  if (loan.status === 'cancelled' || loan.status === 'defaulted') {
    return res.status(422).json({ error: `Cannot add repayments to a ${loan.status} loan.` });
  }

  const amountCents = toCents(req.body.amount);
  const remainingCents = Math.max(0, loan.principalCents - loan.repaidCents);
  if (amountCents > remainingCents) {
    return res.status(422).json({ error: `Repayment exceeds remaining balance (${Math.round(remainingCents / 100)} ${req.user.currency}).` });
  }

  const repaymentDate = req.body.date ? new Date(req.body.date) : new Date();
  const repaymentOutcome = applyRepayment(loan, amountCents, repaymentDate);
  loan.repayments.push({
    amountCents,
    date: repaymentDate,
    method: req.body.method || 'other',
    note: (req.body.note || '').trim().slice(0, 200),
  });
  loan.repaidCents = repaymentOutcome.nextRepaidCents;
  loan.status = repaymentOutcome.status;
  loan.closedAt = repaymentOutcome.closedAt;
  await loan.save();

  await logAudit({
    user: req.user._id,
    action: 'loan.repayment',
    entity: 'Loan',
    entityId: loan._id,
    metadata: { amountCents, repaidCents: loan.repaidCents, status: loan.status },
  });

  res.status(201).json({ loan: serializeLoan(loan.toObject(), req.user.currency) });
}));

router.patch('/:id/status', [
  body('status').isIn(['active', 'defaulted', 'cancelled', 'paid']).withMessage('Invalid loan status'),
], wrap(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array().map(error => error.msg) });

  const loan = await Loan.findOne({ _id: req.params.id, user: req.user._id });
  if (!loan) return res.status(404).json({ error: 'Loan not found.' });

  const nextStatus = req.body.status;
  if (nextStatus === 'paid' && loan.repaidCents < loan.principalCents) {
    return res.status(422).json({ error: 'Loan can only be marked as paid after full repayment.' });
  }

  loan.status = nextStatus;
  loan.closedAt = nextStatus === 'paid' || nextStatus === 'cancelled' ? new Date() : null;
  await loan.save();

  await logAudit({
    user: req.user._id,
    action: 'loan.status',
    entity: 'Loan',
    entityId: loan._id,
    metadata: { status: nextStatus },
  });

  res.json({ loan: serializeLoan(loan.toObject(), req.user.currency) });
}));

router.delete('/:id', wrap(async (req, res) => {
  const loan = await Loan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!loan) return res.status(404).json({ error: 'Loan not found.' });

  await logAudit({
    user: req.user._id,
    action: 'loan.delete',
    entity: 'Loan',
    entityId: loan._id,
    metadata: { type: loan.type, counterparty: loan.counterparty },
  });

  res.json({ ok: true });
}));

module.exports = router;
