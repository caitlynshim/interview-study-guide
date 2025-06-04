import dbConnect from '../../../lib/dbConnect';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { question, category, difficulty } = req.body;

  // Validation
  if (!question || !question.trim()) {
    return res.status(400).json({ message: 'Question text is required' });
  }

  if (!category || !category.trim()) {
    return res.status(400).json({ message: 'Category is required' });
  }

  if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
    return res.status(400).json({ message: 'Valid difficulty is required (easy, medium, hard)' });
  }

  try {
    await dbConnect();

    // Get questions collection directly
    const db = mongoose.connection.db;
    const questionsCollection = db.collection('questions');

    // Create new question document
    const newQuestion = {
      question: question.trim(),
      category: category.trim(),
      difficulty,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert the question
    const result = await questionsCollection.insertOne(newQuestion);

    res.status(201).json({
      success: true,
      id: result.insertedId,
      message: 'Question added successfully'
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 