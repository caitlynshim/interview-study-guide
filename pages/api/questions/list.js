import dbConnect from '../../../lib/dbConnect';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { category, page = 1, limit = 50 } = req.query;

  try {
    await dbConnect();

    // Build the query
    let query = {};
    if (category && category !== 'All') {
      query.category = category;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get questions collection directly
    const db = mongoose.connection.db;
    const questionsCollection = db.collection('questions');

    // Fetch questions with pagination
    const questions = await questionsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Get total count
    const total = await questionsCollection.countDocuments(query);

    res.status(200).json({
      questions,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 