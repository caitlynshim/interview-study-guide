import dbConnect from '../../../lib/dbConnect';
import Experience from '../../../models/Experience';
import { openai } from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ message: 'Question and answer are required' });
  }

  try {
    await dbConnect();

    // First, evaluate the answer quality
    const evaluationPrompt = `Please evaluate this interview answer:

Question: ${question}

Answer: ${answer}

Provide constructive feedback on:
1. Content quality and completeness
2. Structure and clarity
3. Specific examples and evidence
4. Areas for improvement
5. Overall rating (1-10)

Format your response in markdown with clear sections.`;

    const evaluationResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.7,
    });

    const evaluation = evaluationResponse.choices[0].message.content;

    // Check for similar experiences using vector search
    let matchedExperience = null;
    let suggestedUpdate = null;

    try {
      // Generate embedding for the answer
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: answer,
      });
      const answerEmbedding = embeddingResponse.data[0].embedding;

      // Search for similar experiences
      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: answerEmbedding,
            numCandidates: 100,
            limit: 5,
          },
        },
        {
          $project: {
            title: 1,
            content: 1,
            'metadata.category': 1,
            'metadata.tags': 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const similarExperiences = await Experience.aggregate(pipeline);
      
      // If we find a highly similar experience (score > 0.85), suggest an update
      if (similarExperiences.length > 0 && similarExperiences[0].score > 0.85) {
        matchedExperience = similarExperiences[0];

        // Generate suggested update
        const updatePrompt = `You have an existing experience and a new answer. Please suggest an improved version that combines the best of both:

Existing Experience:
${matchedExperience.content}

New Answer:
${answer}

Please provide an improved version that:
1. Keeps the best parts of the existing experience
2. Incorporates new insights from the answer
3. Maintains consistency in tone and style
4. Provides more detail and better examples

Return only the improved experience content, no explanation.`;

        const updateResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: updatePrompt }],
          temperature: 0.7,
        });

        suggestedUpdate = {
          content: updateResponse.choices[0].message.content,
          title: matchedExperience.title,
        };
      }
    } catch (vectorError) {
      console.error('Vector search failed:', vectorError);
      // Continue without similarity matching if vector search fails
    }

    res.status(200).json({
      evaluation,
      matchedExperience,
      suggestedUpdate,
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 