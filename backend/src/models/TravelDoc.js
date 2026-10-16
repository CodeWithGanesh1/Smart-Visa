const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['passport', 'visa', 'insurance', 'vaccination'], required: true },
  title: { type: String, required: true, trim: true },
  country: { type: String, default: '', trim: true },
  numberEnc: { type: String, default: '' },
  issueDate: Date,
  validFrom: Date,
  expiryDate: Date,
  visaType: { type: String, default: '' },
  entryType: { type: String, enum: ['single', 'multiple', ''], default: '' },
  provider: { type: String, default: '' },
  vaccine: { type: String, default: '' },
  notes: { type: String, default: '' },
  file: { name: String, mime: String, data: { type: String, select: false } },
  renewals: [{ at: { type: Date, default: Date.now }, oldExpiry: Date, newExpiry: Date }],
}, { timestamps: true });
module.exports = mongoose.model('TravelDoc', schema);
