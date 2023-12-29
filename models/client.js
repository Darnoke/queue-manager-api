const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  assignedNumber: { type: Number, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['waiting', 'inProgress', 'done'], default: 'waiting' },
});

module.exports = mongoose.model('Client', ClientSchema);
