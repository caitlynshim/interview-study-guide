import connectToDatabase from '../../../lib/mongodb';
import Experience from '../../../models/Experience';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { query, tags } = req.query;
    const filter = {};

    // Add text search if query is provided
    if (query) {
      filter.$text = { $search: query };
    }

    // Add tags filter if provided
    if (tags) {
      filter.tags = { $all: tags.split(',') };
    }

    const experiences = await Experience.find(filter)
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: experiences
    });
  } catch (error) {
    console.error('Error searching experiences:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching experiences'
    });
  }
} 