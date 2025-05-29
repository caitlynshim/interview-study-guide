import dbConnect from '../../../lib/mongodb';
import Question from '../../../models/Question';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Build query based on category filter
    const query = {};
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Get random question from the filtered set
    const count = await Question.countDocuments(query);
    if (count === 0) {
      return res.status(404).json({ 
        message: query.category 
          ? `No questions found in category: ${query.category}` 
          : 'No questions found'
      });
    }
    
    const random = Math.floor(Math.random() * count);
    const question = await Question.findOne(query).skip(random);

    res.status(200).json(question);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 