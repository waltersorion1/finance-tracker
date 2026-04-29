const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  category: { type: String, required: true, trim: true },
  subcategory: { type: String, trim: true, default: '' },
  amountCents: { type: Number, required: true, min: 1 },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'monthly' },
  nextRunAt: { type: Date, required: true },
  lastRunAt: { type: Date },
  reflection: { type: String, trim: true, default: '', maxlength: 300 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

recurringTransactionSchema.index({ user: 1, active: 1, nextRunAt: 1 });

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);
