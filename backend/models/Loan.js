const mongoose = require('mongoose');

const repaymentSchema = new mongoose.Schema({
  amountCents: { type: Number, required: true, min: 1 },
  date: { type: Date, default: Date.now },
  method: { type: String, enum: ['cash', 'transfer', 'mobile-money', 'card', 'other'], default: 'other' },
  note: { type: String, trim: true, default: '', maxlength: 200 },
}, { _id: false });

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['borrowed'], default: 'borrowed' },
  counterparty: { type: String, required: true, trim: true, maxlength: 80 },
  principalCents: { type: Number, required: true, min: 1 },
  repaidCents: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'paid', 'defaulted', 'cancelled'], default: 'active' },
  issuedAt: { type: Date, default: Date.now },
  dueAt: { type: Date },
  interestRate: { type: Number, default: 0, min: 0, max: 300 },
  purpose: { type: String, trim: true, default: '', maxlength: 200 },
  notes: { type: String, trim: true, default: '', maxlength: 400 },
  closedAt: { type: Date },
  repayments: { type: [repaymentSchema], default: [] },
}, { timestamps: true });

loanSchema.index({ user: 1, status: 1, dueAt: 1 });
loanSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('Loan', loanSchema);
