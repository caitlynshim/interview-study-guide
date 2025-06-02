const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point',
  },
  coordinates: {
    type: [Number], // for vector search placeholder (1536 dims)
    required: true,
  },
}, { _id: false });

const ExperienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
  },
  metadata: {
    tags: [String],
    date: Date,
    category: String,
    role: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Experience || mongoose.model('Experience', ExperienceSchema); 