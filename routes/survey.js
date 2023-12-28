const express = require('express');
const router = express.Router();
const Question = require('../models/question');
const Survey = require('../models/survey');
const Queue = require('../models/queue');

router.post('/:queueId', async (req, res) => {
  try { // create survey model, return survey id
    const queueId = req.params.queueId;

    const queue = await Queue.findById(queueId, '_id questions').populate('questions');
    if (!queue) {
      return res.status(404).send('Queue not found');
    }

    const startQuestion = queue.questions.find(question => question.isStart);

    const survey = await Survey.create({
      queue: queue._id,
      answers: [],
      currentQuestion: startQuestion._id,
    });
    res.status(200).json({ surveyId: survey._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:queueId/:surveyId', async (req, res) => {
  try { // return survey, with current question and answers
    const queueId = req.params.queueId;
    const surveyId = req.params.surveyId;

    const survey = await Survey.findById(surveyId);
    if (!survey) {
      return res.status(404).send('Survey not found');
    }

    if (survey.finished) {
      return res.status(200).json({ finished: true, assignedNumber: survey.assignedNumber });
    }
    
    const questionAndAnswers = await getQuestionAndAnswers(queueId, surveyId);
    if (questionAndAnswers === null) {
      return res.status(404).send('Queue not found');
    }

    res.status(200).json({ ...questionAndAnswers, finished: false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/:queueId/:surveyId', async (req, res) => {
  try { // update survey with answer, return new question and answers or if end of survey, return end of survey
    const queueId = req.params.queueId;
    const surveyId = req.params.surveyId;

    const queue = await Queue.findById(queueId).populate('questions');
    const survey = await Survey.findById(surveyId);
    if (!queue || !survey) {
      return res.status(404).send('Queue not found');
    }

    const answerId = req.body.answerId;
    const questionId = req.body.questionId;

    if (!answerId || !questionId) {
      return res.status(400).send('Answer or question not provided');
    }

    if (!survey.currentQuestion.equals(questionId)) {
      return res.status(400).send('Question does not match current question');
    }
    const answer = queue.questions.find(question => question._id.equals(questionId)).answers.find(answer => answer._id.equals(answerId));
    if (!answer) {
      return res.status(400).send('Answer not found');
    }
    survey.answers.push({ question: questionId, answerId: answerId });

    if (answer.nextQuestion) {
      survey.currentQuestion = answer.nextQuestion;
      await survey.save();

      const questionAndAnswers = await getQuestionAndAnswers(queueId, surveyId);
      if (questionAndAnswers === null) {
        return res.status(404).send('Queue not found');
      }
      return res.status(200).json({ ...questionAndAnswers, finished: false });
    } else {
      survey.finished = true;
      survey.assignedCategory = answer.category;
      survey.assignedNumber = 1;

      await survey.save();

      return res.status(200).json({ assignedNumber: survey.assignedNumber, finished: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const getQuestionAndAnswers = async (queueId, surveyId) => {
  const queue = await Queue.findById(queueId, '_id questions').populate('questions');
  const survey = await Survey.findById(surveyId);
  if (!queue || !survey || survey.finished) {
    return null;
  }
  const currentQuestion = queue.questions.find(question => question._id.equals(survey.currentQuestion));
  const answers = currentQuestion.answers.map(answer => ({ _id: answer._id, answer: answer.answer }));

  const question = { _id: currentQuestion._id, question: currentQuestion.question };

  return { question, answers };
};

module.exports = router;