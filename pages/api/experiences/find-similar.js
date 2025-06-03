const dbConnect = require('../../../lib/dbConnect');
const Experience = require('../../../models/Experience');
const { generateEmbedding } = require('../../../lib/openai');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ message: 'Missing text in body' });
  }
  try {
    await dbConnect();
    const queryEmbedding = await generateEmbedding(text);
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_search',
          queryVector: queryEmbedding,
          path: 'embedding',
          numCandidates: 100,
          limit: 1,
        },
      },
      { $project: { content: 1, title: 1, _id: 1, metadata: 1, embedding: 1 } },
    ];
    let results = [];
    try {
      results = await Experience.aggregate(pipeline);
    } catch (err) {
      console.error('[find-similar] Vector search failed:', err);
      return res.status(500).json({ message: 'Vector search failed', error: err.message });
    }
    if (!results.length) {
      return res.status(200).json({ match: null, similarity: 0 });
    }
    // Compute cosine similarity (since MongoDB doesn't return it)
    function cosineSim(a, b) {
      const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
      const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
      const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
      return dot / (normA * normB);
    }
    const match = results[0];
    const similarity = cosineSim(queryEmbedding, match.embedding);
    // Debug log for similarity and match
    console.log('[find-similar] similarity:', similarity, 'title:', match.title, 'content:', match.content);
    // Threshold for a 'good' match (tune as needed)
    if (similarity < 0.80) {
      return res.status(200).json({ match: null, similarity });
    }
    // Remove embedding from response
    delete match.embedding;
    res.status(200).json({ match, similarity });
  } catch (error) {
    console.error('[find-similar] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

export default handler; 