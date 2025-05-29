import dbConnect from '../../../lib/mongodb';
import Question from '../../../models/Question';
import Experience from '../../../models/Experience';
import { generateEmbedding, generateAnswer } from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { questionId } = req.body;
    
    // Get the question
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Generate embedding for the question if it doesn't exist
    if (!question.embedding) {
      question.embedding = await generateEmbedding(question.question);
      await question.save();
    }

    // Find relevant experiences using vector similarity
    const relevantExperiences = await Experience.aggregate([
      {
        $search: {
          index: "vector_index",
          knnBeta: {
            vector: question.embedding,
            path: "embedding",
            k: 3
          }
        }
      }
    ]);

    // Generate answer using OpenAI
    const answer = await generateAnswer(question.question, relevantExperiences);

    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error generating answer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 