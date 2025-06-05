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
  embeddingBin: Buffer,
  metadata: {
    tags: [String],
    date: Date,
    category: String,
    role: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// CRITICAL: Auto-regenerate embeddings when content changes to maintain vector search consistency
ExperienceSchema.pre('save', async function(next) {
  // Only regenerate embedding if title or content has been modified
  if (this.isModified('title') || this.isModified('content')) {
    try {
      // Dynamically import to avoid circular dependencies
      const { generateEmbedding } = require('../lib/openai');
      const { toDenseVectorFloat32 } = require('../lib/embeddingUtil');
      
      console.log(`[MIDDLEWARE] Regenerating embedding for: ${this.title}`);
      const arr = await generateEmbedding(`${this.title}\n${this.content}`);
      this.embedding = arr;
      this.embeddingBin = toDenseVectorFloat32(arr);
      console.log(`[MIDDLEWARE] Successfully regenerated embedding for: ${this.title}`);
      
      // Update the updatedAt timestamp
      this.updatedAt = new Date();
    } catch (error) {
      console.error(`[MIDDLEWARE] Failed to regenerate embedding for "${this.title}":`, error.message);
      // Don't block the save operation, but log the error
      // In production, you might want to throw the error to prevent saving without embedding
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.models.Experience || mongoose.model('Experience', ExperienceSchema); 