const mongoose = require('mongoose');
const AnswerSchema = require('./answerSchema');

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answers: [AnswerSchema],
  isStart: { type: Boolean, required: true },
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;