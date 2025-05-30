import connectToDatabase from '../../../lib/mongodb';
import Experience from '../../../models/Experience';
import { generateEmbedding } from '../../../lib/openai';

// Helper function to normalize tags input
function normalizeTags(tags) {
  if (!tags) return null;
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') return tags.split(',');
  return null;
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a, b) {
  // Handle edge cases
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Avoid division by zero
  if (normA === 0 || normB === 0) return 0;

  // Round to avoid floating point precision issues
  return Math.round((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) * 1000) / 1000;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToDatabase();

    const { q: query, tags } = req.query;
    console.log('Search query:', query);
    console.log('Tags:', tags);
    
    // Generate embedding for the search query
    const searchEmbedding = query ? await generateEmbedding(query) : null;
    console.log('Search embedding:', searchEmbedding ? searchEmbedding.slice(0, 5) : null);

    // Normalize tags
    const normalizedTags = normalizeTags(tags);
    console.log('Normalized tags:', normalizedTags);

    // Get all experiences
    let experiences = await Experience.find(normalizedTags ? { tags: { $all: normalizedTags } } : {}).lean();
    console.log('Found experiences:', experiences.map(e => e.title));

    // If we have a search query, sort by vector similarity
    if (searchEmbedding) {
      experiences = experiences
        .map(exp => {
          const similarity = cosineSimilarity(searchEmbedding, exp.embedding);
          console.log(`Similarity for ${exp.title}:`, similarity);
          return { ...exp, similarity };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20)
        .map(({ similarity, ...exp }) => exp);
    } else {
      // Otherwise sort by most recent
      experiences = experiences
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20);
    }

    console.log('Sorted experiences:', experiences.map(e => e.title));
    res.status(200).json(experiences);
  } catch (error) {
    console.error('Error searching experiences:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching experiences'
    });
  }
} 