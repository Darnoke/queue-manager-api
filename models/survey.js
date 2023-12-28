const mongoose = require('mongoose');
const QuestionAnswerSchema = require('./questionAnswerSchema');
const Category = require('./category');

const surveySchema = new mongoose.Schema({
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
  answers: [ QuestionAnswerSchema ],
  finished: { type: Boolean, default: false },
  assignedNumber: { type: Number },
  assignedCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  currentQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
});

const Survey = mongoose.model('Survey', surveySchema);

module.exports = Survey;