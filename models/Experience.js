import mongoose from 'mongoose';

const ExperienceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number],
    required: true,
    index: true, // Will be used for vector search
  },
  tags: [{
    type: String,
    index: true,
  }],
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create vector search index
ExperienceSchema.index(
  { embedding: "2dsphere" },
  {
    name: "vector_index",
    weights: { embedding: 1 }
  }
);

export default mongoose.models.Experience || mongoose.model('Experience', ExperienceSchema); 