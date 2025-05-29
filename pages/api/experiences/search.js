import dbConnect from '../../../lib/mongodb';
import Experience from '../../../models/Experience';
import { generateEmbedding } from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { q: query, tags } = req.query;
    
    // Generate embedding for the search query
    const searchEmbedding = await generateEmbedding(query);

    // Build the aggregation pipeline
    const pipeline = [
      {
        $search: {
          knnBeta: {
            vector: searchEmbedding,
            path: 'embedding',
            k: 10, // Return top 10 matches
          }
        }
      }
    ];

    // Add tag filtering if specified
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      pipeline.push({
        $match: {
          tags: { $in: tagArray }
        }
      });
    }

    // Add projection to include score
    pipeline.push({
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        tags: 1,
        date: 1,
        score: { $meta: "searchScore" }
      }
    });

    const results = await Experience.aggregate(pipeline);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error searching experiences:', error);
    res.status(500).json({ 
      message: 'Failed to search experiences', 
      details: error.message || 'Unknown error'
    });
  }
} 