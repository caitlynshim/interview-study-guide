import connectToDatabase from '../../../lib/mongodb';
import Question from '../../../models/Question';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET']
    });
  }

  try {
    await connectToDatabase();

    const { category } = req.query;
    const query = category ? { category } : {};

    // Validate category if provided
    if (category) {
      const validCategories = await Question.distinct('category');
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          error: 'Invalid category',
          message: `Category '${category}' not found`,
          validCategories
        });
      }
    }

    const count = await Question.countDocuments(query);
    
    if (count === 0) {
      return res.status(404).json({
        error: 'No questions found',
        message: category ? `No questions found in category '${category}'` : 'No questions available in the database'
      });
    }

    const random = Math.floor(Math.random() * count);
    const question = await Question.findOne(query).skip(random);

    if (!question) {
      return res.status(404).json({
        error: 'Question not found',
        message: 'Failed to retrieve random question'
      });
    }

    res.status(200).json(question);
  } catch (error) {
    console.error('Database error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'MongoServerError') {
      return res.status(503).json({
        error: 'Database connection error',
        message: 'Unable to connect to the database'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while fetching random question'
    });
  }
} 