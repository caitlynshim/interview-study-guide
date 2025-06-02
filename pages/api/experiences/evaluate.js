import dbConnect from '../../../lib/mongodb';
import { generateEmbedding, openai } from '../../../lib/openai';
import Experience from '../../../models/Experience';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ message: 'Missing question or answer in body' });
  }
  try {
    await dbConnect();
    // 1. Evaluate the answer using OpenAI
    const evalPrompt = `You are a world-class technical executive interviewer (CTO, AWS Bar Raiser). Critically evaluate the following answer to the interview question. Be specific about strengths, weaknesses, and improvement areas. Hold an extremely high bar: answers must be specific, result-oriented, data-driven, and use 'I' language (not 'we'). Highlight business impact and unique contributions. If the answer is vague, generic, or lacks metrics, call it out. Format your feedback in markdown with clear sections: Strengths, Areas for Improvement, and Overall Assessment.\n\nQuestion: ${question}\n\nAnswer: ${answer}`;
    const evalResp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a world-class technical executive interviewer.' },
        { role: 'user', content: evalPrompt },
      ],
      temperature: 0.2,
    });
    const evaluation = evalResp.choices[0].message.content.trim();
    // 2. Embed the answer and search for similar experiences
    const answerEmbedding = await generateEmbedding(answer);
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_search',
          queryVector: answerEmbedding,
          path: 'embedding',
          numCandidates: 100,
          limit: 1,
        },
      },
      { $project: { content: 1, title: 1, _id: 1, metadata: 1 } },
    ];
    let match = null;
    try {
      const results = await Experience.aggregate(pipeline);
      if (results && results.length > 0) {
        // Only consider a match if similarity is high (not available directly, so use content similarity heuristics)
        match = results[0];
      }
    } catch (err) {
      // fallback: no match
    }
    let suggestedUpdate = null;
    if (match) {
      // Suggest an update if the answer is more detailed or different
      const updatePrompt = `You are an expert at merging and improving interview experiences. Given the existing experience and the new answer, suggest an improved version that combines the best details, adds missing metrics, and ensures specificity, 'I' language, and business impact. Format as markdown.\n\nExisting Experience:\n${match.content}\n\nNew Answer:\n${answer}\n\nImproved Experience:`;
      const updateResp = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert at merging and improving interview experiences.' },
          { role: 'user', content: updatePrompt },
        ],
        temperature: 0.2,
      });
      suggestedUpdate = { content: updateResp.choices[0].message.content.trim() };
    }
    res.status(200).json({ evaluation, suggestedUpdate, matchedExperience: match });
  } catch (error) {
    console.error('Evaluate error:', error, error.stack);
    res.status(500).json({ message: 'Internal server error', error: error.message, stack: error.stack });
  }
} 