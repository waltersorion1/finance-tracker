const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true, trim: true },
  limitCents: { type: Number, required: true, min: 1 },
  period: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
  alertThreshold: { type: Number, default: 80, min: 1, max: 100 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

budgetSchema.index({ user: 1, category: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
