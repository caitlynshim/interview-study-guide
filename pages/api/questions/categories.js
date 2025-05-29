import dbConnect from '../../../lib/mongodb';
import Question from '../../../models/Question';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Get unique categories
    const categories = await Question.distinct('category');
    
    res.status(200).json(categories);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 