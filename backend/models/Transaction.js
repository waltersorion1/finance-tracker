const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: Date, default: Date.now },
  type:        { type: String, enum: ['Income', 'Expense'], required: true },
  category:    { type: String, required: true, trim: true },
  subcategory: { type: String, trim: true },
  amountCents: { type: Number, required: true, min: 1 },
  account:     { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  reflection:  { type: String, trim: true },
  isNecessary: { type: Boolean },
  flag:        { type: String, trim: true },
}, { timestamps: true });
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
module.exports = mongoose.model('Transaction', transactionSchema);
