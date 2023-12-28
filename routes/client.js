const express = require('express');
const router = express.Router();

const surveyRoutes = require('./survey');

router.use('/survey', surveyRoutes);

module.exports = router;