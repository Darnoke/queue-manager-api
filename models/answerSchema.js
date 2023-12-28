const mongoose = require('mongoose');

const AnswerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  answer: { type: String, required: true },
  isEnd: { type: Boolean, required: true },
  nextQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
});

module.exports = AnswerSchema;