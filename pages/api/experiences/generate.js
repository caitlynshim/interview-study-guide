import dbConnect from '../../../lib/mongodb';
import { generateEmbedding, generateAnswer } from '../../../lib/openai';
import Experience from '../../../models/Experience';

// Cosine similarity function to score relevance
function cosineSimilarity(vecA, vecB) {
  // Handle cases where embeddings might be missing or invalid
  if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0; // Return 0 similarity if vectors are invalid
  }
  
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0; // Handle zero vectors
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ message: 'Missing question in body' });
  }

  try {
    await dbConnect();

    // 1. Embed the question
    const queryEmbedding = await generateEmbedding(question);

    // 2. Attempt Atlas vector search first
    let results = [];
    try {
      results = await Experience.aggregate([
        {
          $vectorSearch: {
            index: 'vector_search_bin',
            path: 'embeddingBin',
            queryVector: queryEmbedding,
            numCandidates: 100,
            limit: 100,
          },
        },
        { $project: { title: 1, content: 1, _id: 1, embeddingBin: 1 } },
      ]);
    } catch (e) {
      console.error('vectorSearch error', e.message);
    }

    let usedFallback = false;

    if (results.length === 0) {
      usedFallback = true;
      // Local cosine ranking fallback
      const allDocs = await Experience.find({}, { title: 1, content: 1, embedding: 1 }).lean();
      results = allDocs.map(d => ({
        _id: d._id,
        title: d.title,
        content: d.content,
        similarity: cosineSimilarity(queryEmbedding, d.embedding),
      }));
    } else {
      // compute similarity for Atlas results
      results = results.map(r => ({ ...r, similarity: cosineSimilarity(queryEmbedding, r.embeddingBin) }));
    }

    // 3. Filter for relevance
    const RELEVANCE_THRESHOLD = 0.2;

    const relevantResults = results
      .filter(result => result.similarity >= RELEVANCE_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log(`[RAG] Local cosine: ${results.length} candidates, ${relevantResults.length} above threshold ${RELEVANCE_THRESHOLD}`);

    const contextResults = relevantResults.map(({ similarity, ...rest }) => rest);

    // 4. Build context for AI
    const context = contextResults.map((r, idx) => 
      `(${idx + 1}) ${r.title ? r.title + ': ' : ''}${r.content}`
    ).join('\n');

    // 5. Generate answer via OpenAI with enhanced prompt for insufficient context
    let answer;
    if (contextResults.length === 0) {
      // No relevant experiences found - let AI know explicitly
      answer = await generateAnswer({ 
        question, 
        context: '' 
      });
      console.log('[RAG] No relevant experiences found, asking AI to respond accordingly');
    } else {
      answer = await generateAnswer({ question, context });
      console.log(`[RAG] Generated answer using ${contextResults.length} relevant experiences`);
    }

    // 6. Only append references for experiences that were actually used
    if (contextResults && contextResults.length > 0) {
      const references = contextResults
        .map((r, idx) => `**[${idx + 1}]** [${r.title ? r.title : 'Experience'}](/navigate-experiences#${r._id}): ${r.content}`)
        .join('\n\n');
      answer += `\n\n---\n**References:**\n${references}`;
    }

    res.status(200).json({ 
      answer, 
      context: contextResults,
      debug: {
        candidatesFound: results.length,
        relevantResults: relevantResults.length,
        threshold: RELEVANCE_THRESHOLD,
        usedFallback: usedFallback
      }
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 