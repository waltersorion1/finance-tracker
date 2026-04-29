const mongoose = require('mongoose');
const accountSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:         { type: String, required: true, trim: true },
  type:         { type: String, enum: ['core', 'goal'], default: 'core' },
  balanceCents: { type: Number, default: 0, min: 0 },
  percentage:   { type: Number, default: 0, min: 0, max: 100 }, // % of income auto-distributed here
  goalCents:    { type: Number, default: 0, min: 0 },           // savings target (0 = none)
}, { timestamps: true });
module.exports = mongoose.model('Account', accountSchema);