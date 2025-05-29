import dbConnect from '../../../lib/mongodb';
import Experience from '../../../models/Experience';
import { generateEmbedding } from '../../../lib/openai';

// Batch size for processing multiple experiences
const BATCH_SIZE = 5;

/**
 * Process experiences in batches to respect rate limits
 */
async function processBatch(experiences) {
  const results = [];
  
  for (let i = 0; i < experiences.length; i += BATCH_SIZE) {
    const batch = experiences.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (exp) => {
        const textToEmbed = `${exp.title} ${exp.description}`;
        const embedding = await generateEmbedding(textToEmbed);
        return {
          ...exp,
          embedding,
          date: exp.date || new Date()
        };
      })
    );
    results.push(...batchResults);
    
    // Add a small delay between batches to help with rate limiting
    if (i + BATCH_SIZE < experiences.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    // Handle both single experience and batch uploads
    const experiencesData = Array.isArray(req.body) ? req.body : [req.body];
    
    // Process experiences in batches
    const processedExperiences = await processBatch(experiencesData);
    
    // Create all experiences
    const experiences = await Experience.create(processedExperiences);
    
    res.status(201).json(experiences);
  } catch (error) {
    console.error('Error adding experience:', error);
    // Send a more detailed error message to the client
    res.status(500).json({ 
      message: 'Failed to add experience', 
      details: error.message || 'Unknown error'
    });
  }
} 