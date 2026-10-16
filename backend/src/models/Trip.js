const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  country: { type: String, required: true, trim: true },
  entryDate: { type: Date, required: true },
  exitDate: Date,
  purpose: { type: String, default: '' },
  visa: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelDoc', default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.model('Trip', schema);
