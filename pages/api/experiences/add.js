import { connectToDatabase } from '../../../lib/mongodb';
import Experience from '../../../models/Experience';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { title, description, content, tags } = req.body;

    if (!title || !description || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and content are required'
      });
    }

    const experience = new Experience({
      title,
      description,
      content,
      tags: tags || []
    });

    await experience.save();

    res.status(201).json({
      success: true,
      data: experience
    });
  } catch (error) {
    console.error('Error adding experience:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding experience'
    });
  }
} 