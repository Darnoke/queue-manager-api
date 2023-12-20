const mongoose = require('mongoose');

const EdgeSchema = new mongoose.Schema({
  source: { type: String, required: true },
  sourceHandle: { type: String, required: true },
  target: { type: String, required: true },
  targetHandle: { type: String, required: true },
  id: { type: String, required: true },
});

module.exports = EdgeSchema;