const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  active: { type: Boolean, default: true },
  prefs: {
    reminderDays: { type: [Number], default: [90, 60, 30, 7] },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    overstay: { type: Boolean, default: true },
    compliance: { type: Boolean, default: true },
  },
  lastLoginAt: Date,
  resetTokenHash: { type: String, select: false },
  resetExpires: { type: Date, select: false },
}, { timestamps: true });
module.exports = mongoose.model('User', schema);
