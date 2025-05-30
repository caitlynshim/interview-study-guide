import connectToDatabase from '../../../lib/mongodb';
import Question from '../../../models/Question';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { category } = req.query;
    const query = category ? { category } : {};

    const count = await Question.countDocuments(query);
    const random = Math.floor(Math.random() * count);
    const question = await Question.findOne(query).skip(random);

    if (!question) {
      return res.status(404).json({ message: 'No questions found' });
    }

    res.status(200).json(question);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 