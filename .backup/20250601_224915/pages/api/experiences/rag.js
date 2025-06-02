import { Configuration, OpenAIApi } from 'openai';
import mongoose from 'mongoose';
import Experience from '../../../models/Experience';
import Logger from '../../../lib/logger';
import { rateLimit } from '../../../lib/middleware/rateLimit';

const logger = new Logger('rag');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    logger.info('Generating embedding for query...');
    const embeddingResponse = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: query,
    });

    const queryEmbedding = embeddingResponse.data.data[0].embedding;
    logger.info('Performing vector search...');

    const experiences = await Experience.aggregate([
      {
        $search: {
          index: 'experiences_vector',
          knnBeta: {
            vector: queryEmbedding,
            path: 'embedding',
            k: 3,
          }
        }
      }
    ]);

    if (!experiences || experiences.length === 0) {
      logger.warn('No relevant experiences found');
      return res.status(404).json({ 
        error: 'No relevant experiences found',
        message: 'Would you like to add a new experience? Click here to contribute.',
        addExperienceUrl: '/experiences/add'
      });
    }

    logger.info('Generating answer...');
    const prompt = `Question: ${query}\n\nRelevant experiences:\n${experiences.map(exp => 
      `Title: ${exp.title}\nDescription: ${exp.description}\nTags: ${exp.tags.join(', ')}\n---\n`
    ).join('\n')}`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful interview preparation assistant. Use the provided experiences to answer the question in a STAR format. If the experiences are not relevant, say so clearly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
    });

    const answer = completion.data.choices[0].message.content;
    logger.info('Successfully generated answer');

    res.status(200).json({
      answer,
      experiences: experiences.map(exp => ({
        title: exp.title,
        description: exp.description,
        tags: exp.tags
      }))
    });

  } catch (error) {
    logger.error('Error in RAG pipeline:', error);
    res.status(500).json({ error: 'Failed to generate answer' });
  }
}

// Apply rate limiting middleware
export default rateLimit(handler); 