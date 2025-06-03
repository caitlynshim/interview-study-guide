import dbConnect from '../../../lib/mongodb';
import { generateEmbedding, generateAnswer } from '../../../lib/openai';
import Experience from '../../../models/Experience';

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

    // 2. Vector search in MongoDB Atlas (assumes vector index on embedding field)
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_search',
          queryVector: queryEmbedding,
          path: 'embedding',
          numCandidates: 100,
          limit: 3,
        },
      },
      { $project: { content: 1, title: 1, _id: 1 } },
    ];

    let results;
    try {
      results = await Experience.aggregate(pipeline);
    } catch (err) {
      console.error('Vector search failed, falling back to $search or random docs', err);
      // Try fallback to $search if available
      try {
        const fallbackPipeline = [
          {
            $search: {
              index: 'vector_search',
              knnBeta: {
                vector: queryEmbedding,
                path: 'embedding',
                k: 3
              }
            }
          },
          { $project: { content: 1, title: 1, _id: 1 } },
        ];
        results = await Experience.aggregate(fallbackPipeline);
      } catch (fallbackErr) {
        console.error('Fallback $search failed, returning random docs', fallbackErr);
        results = await Experience.find({}).limit(3).select('content -_id');
      }
    }

    const context = results.map((r, idx) => `(${idx + 1}) ${r.title ? r.title + ': ' : ''}${r.content}`).join('\n');

    // 3. Generate answer via OpenAI
    let answer = await generateAnswer({ question, context });

    // Append references section
    if (results && results.length > 0) {
      const references = results
        .map((r, idx) => `**[${idx + 1}]** [${r.title ? r.title : 'Experience'}](/navigate-experiences#${r._id}): ${r.content}`)
        .join('\n\n');
      answer += `\n\n---\n**References:**\n${references}`;
    }

    res.status(200).json({ answer, context: results });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 