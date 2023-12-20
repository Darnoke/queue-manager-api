const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  data: { type: mongoose.Schema.Types.Mixed },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  selected: { type: Boolean, default: false },
  positionAbsolute: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  dragging: { type: String },
});

module.exports = NodeSchema;