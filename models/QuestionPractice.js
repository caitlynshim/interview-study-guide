import mongoose from 'mongoose';

const QuestionPracticeSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  datePracticed: {
    type: Date,
    default: Date.now,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  practiceType: {
    type: String,
    enum: ['written', 'spoken'],
    required: true
  },
  userAnswer: {
    type: String,
    required: true
  },
  evaluation: {
    type: String,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  },
  metadata: {
    answerLength: Number,
    transcriptionTime: Number, // for spoken answers
    evaluationTime: Number
  }
}, {
  timestamps: true
});

// Indexes for performance
QuestionPracticeSchema.index({ questionId: 1, datePracticed: -1 });
QuestionPracticeSchema.index({ category: 1, datePracticed: -1 });
QuestionPracticeSchema.index({ rating: 1, datePracticed: -1 });
QuestionPracticeSchema.index({ datePracticed: -1 });

export default mongoose.models.QuestionPractice || mongoose.model('QuestionPractice', QuestionPracticeSchema); 