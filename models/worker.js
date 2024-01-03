const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue'},
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  currentStatus: { type: String, enum: ['free', 'occupied', 'not_available'], default: 'not_available' },
  currentClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  clientActionsHistory: [{
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    action: { type: String, enum: ['waiting', 'inProgress', 'done'] },
    createdAt: { type: Date, default: Date.now },
  }],
});

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
