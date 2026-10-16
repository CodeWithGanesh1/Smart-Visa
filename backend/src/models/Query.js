const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  reply: { type: String, default: '' },
  repliedAt: Date,
}, { timestamps: true });
module.exports = mongoose.model('Query', schema);
