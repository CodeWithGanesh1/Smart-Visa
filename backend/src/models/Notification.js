const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doc: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelDoc' },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
  type: { type: String, enum: ['expiry', 'expired', 'overstay', 'compliance', 'test'], required: true },
  threshold: Number,
  channel: { type: String, default: 'email' },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  subject: String,
  message: String,
  error: String,
  key: { type: String, unique: true, sparse: true },
}, { timestamps: true });
module.exports = mongoose.model('Notification', schema);
