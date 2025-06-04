import dbConnect from '../../../lib/dbConnect';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id, question, category, difficulty } = req.body;

  // Validation
  if (!id) {
    return res.status(400).json({ message: 'Question ID is required' });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid question ID format' });
  }

  if (!question || !question.trim()) {
    return res.status(400).json({ message: 'Question text is required' });
  }

  if (!category || !category.trim()) {
    return res.status(400).json({ message: 'Category is required' });
  }

  if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ message: 'Valid difficulty level is required' });
  }

  try {
    await dbConnect();

    const db = mongoose.connection.db;
    const collection = db.collection('questions');

    const updateData = {
      question: question.trim(),
      category: category.trim(),
      difficulty,
      updatedAt: new Date()
    };

    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Question updated successfully',
      updatedQuestion: { _id: id, ...updateData }
    });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 