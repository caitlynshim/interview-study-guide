import dbConnect from '../../../lib/dbConnect';
import QuestionPractice from '../../../models/QuestionPractice';
import Question from '../../../models/Question';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const {
      questionText,
      category,
      rating,
      practiceType,
      userAnswer,
      evaluation,
      timeSpent,
      metadata
    } = req.body;

    // Validate required fields
    if (!questionText || !category || !rating || !practiceType || !userAnswer || !evaluation) {
      return res.status(400).json({ 
        message: 'Missing required fields: questionText, category, rating, practiceType, userAnswer, evaluation' 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 10) {
      return res.status(400).json({ message: 'Rating must be between 1 and 10' });
    }

    // Find or create question record
    let question = await Question.findOne({ question: questionText });
    if (!question) {
      // Create new question if it doesn't exist
      question = new Question({
        question: questionText,
        category: category,
        difficulty: 'medium', // default
        tags: []
      });
      await question.save();
    }

    // Create practice session record
    const practiceSession = new QuestionPractice({
      questionId: question._id,
      questionText,
      category,
      rating,
      practiceType,
      userAnswer,
      evaluation,
      timeSpent: timeSpent || 0,
      metadata: {
        answerLength: userAnswer.length,
        transcriptionTime: metadata?.transcriptionTime || 0,
        evaluationTime: metadata?.evaluationTime || 0
      }
    });

    await practiceSession.save();

    res.status(201).json({
      message: 'Practice session saved successfully',
      practiceSession: {
        id: practiceSession._id,
        questionText,
        category,
        rating,
        practiceType,
        datePracticed: practiceSession.datePracticed
      }
    });

  } catch (error) {
    console.error('Save practice session error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 