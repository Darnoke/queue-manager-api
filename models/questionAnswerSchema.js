const mongoose = require('mongoose');

const QuestionAnswerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  answerId: { type: String, required: true },
});

module.exports = QuestionAnswerSchema;