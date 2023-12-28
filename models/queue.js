const mongoose = require('mongoose');

const NodeSchema = require('./nodeSchema');
const EdgeSchema = require('./edgeSchema');

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
  availableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
});


const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;