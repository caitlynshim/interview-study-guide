import connectToDatabase from '../../../lib/mongodb';
import Experience from '../../../models/Experience';
import { generateEmbedding } from '../../../lib/openai';

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

    // Generate embedding from the content
    const embedding = await generateEmbedding(content);

    const experience = new Experience({
      title,
      description,
      content,
      tags: tags || [],
      embedding
    });

    const savedExperience = await experience.save();

    // Return the saved experience directly
    res.status(201).json(savedExperience);
  } catch (error) {
    console.error('Error adding experience:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding experience'
    });
  }
} 