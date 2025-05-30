const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
    default: []
  },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 1536; // text-embedding-3-small dimensions
      },
      message: props => `Embedding must have exactly 1536 dimensions`
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add text index for basic text search
experienceSchema.index({ title: 'text', description: 'text', content: 'text' });

// Add index on tags for filtering
experienceSchema.index({ tags: 1 });

// Update timestamps on save
experienceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.Experience || mongoose.model('Experience', experienceSchema); 