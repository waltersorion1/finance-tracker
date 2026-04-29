const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  firstName:     { type: String, trim: true, default: '' },
  middleName:    { type: String, trim: true, default: '' },
  lastName:      { type: String, trim: true, default: '' },
  phoneNumber:   { type: String, trim: true, default: '' },
  profilePicture:{ type: String, trim: true, default: '' },
  bio:           { type: String, trim: true, default: '', maxlength: 280 },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      String,
  googleId:      String,
  registeredVia: { type: String, enum: ['local', 'google'], default: 'local' },
  currency:      { type: String, default: 'XAF' },
  language:      { type: String, enum: ['en', 'fr'], default: 'en' },
  theme:         { type: String, enum: ['light', 'dark'], default: 'light' },
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
