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
    
    // Get unique categories
    const categories = await Question.distinct('category');
    
    if (!categories || categories.length === 0) {
      return res.status(404).json({
        error: 'No categories found',
        message: 'The database contains no question categories'
      });
    }
    
    res.status(200).json(categories);
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
      message: 'An unexpected error occurred while fetching categories'
    });
  }
} 