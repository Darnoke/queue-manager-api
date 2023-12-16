const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  survey: { type: mongoose.Schema.Types.Mixed },
  userCategories: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
  }],
  availableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }]
});


const Queue = mongoose.model('Queue', queueSchema);

module.exports = Queue;