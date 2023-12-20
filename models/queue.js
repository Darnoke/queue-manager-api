const mongoose = require('mongoose');

const NodeSchema = require('./node');
const EdgeSchema = require('./edge');

const queueSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  survey: {
    nodes: [NodeSchema],
    edges: [EdgeSchema],
  },
  userCategories: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
  }],
  availableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
});


const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;