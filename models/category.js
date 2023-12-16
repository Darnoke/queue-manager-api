const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
});

const Category = mongoose.model('Category', CategorySchema);

module.exports = Category;