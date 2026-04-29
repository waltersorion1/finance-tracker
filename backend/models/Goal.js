const mongoose = require('mongoose');
const goalSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:        { type: String, required: true, trim: true },
  targetCents: { type: Number, required: true, min: 1 },
  percentage:  { type: Number, default: 0, min: 0, max: 100 },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline:    { type: Date },
  notes:       { type: String, trim: true, default: '', maxlength: 300 },
  account:     { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
}, { timestamps: true });
module.exports = mongoose.model('Goal', goalSchema);
