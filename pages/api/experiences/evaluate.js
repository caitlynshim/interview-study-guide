import dbConnect from '../../../lib/dbConnect';
import Experience from '../../../models/Experience';
import { openai } from '../../../lib/openai';

// Helper function to extract rating from evaluation text
function extractRating(evaluationText) {
  // Look for various rating patterns
  const patterns = [
    /(?:overall\s+)?rating:?\s*(\d+)(?:\/10)?/i,
    /(\d+)(?:\/10|\s*out\s*of\s*10)/i,
    /score:?\s*(\d+)/i,
    /rating\s*of\s*(\d+)/i,
    /give\s*(?:this|it)\s*(?:a|an)?\s*(\d+)/i,
    /(\d+)\s*\/\s*10/,
  ];

  for (const pattern of patterns) {
    const match = evaluationText.match(pattern);
    if (match) {
      const rating = parseInt(match[1]);
      if (rating >= 1 && rating <= 10) {
        return rating;
      }
    }
  }

  // If no explicit rating found, try to infer from keywords
  const text = evaluationText.toLowerCase();
  if (text.includes('excellent') || text.includes('outstanding') || text.includes('exceptional')) {
    return 9;
  } else if (text.includes('very good') || text.includes('strong') || text.includes('well-structured')) {
    return 8;
  } else if (text.includes('good') || text.includes('solid') || text.includes('adequate')) {
    return 7;
  } else if (text.includes('fair') || text.includes('acceptable') || text.includes('decent')) {
    return 6;
  } else if (text.includes('poor') || text.includes('weak') || text.includes('lacking')) {
    return 4;
  } else if (text.includes('very poor') || text.includes('inadequate') || text.includes('insufficient')) {
    return 3;
  }

  // Default to middle rating if cannot determine
  return 6;
}

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

    // First, evaluate the answer quality with explicit rating requirement
    const evaluationPrompt = `You are a technical executive evaluating an interview candidate to be your peer. You are looking for a highly technical and competent leader. I expect detailed answers that show the framework the candidate is using as well as some examples that show that framework in action. You are judging both their ability answer to the question and ability to lead a very technical team. An ideal answer is about 5 minutes long. Please research the topic at hand if you need to. Please evaluate this interview answer and provide a detailed assessment:

Question: ${question}

Answer: ${answer}

Provide constructive feedback on:
1. Content quality and completeness
2. Demonstration on MongoDB's competencies
3. Structure and clarity  
4. Specific examples and evidence
5. Areas for improvement with specific adjustments to the answer given.

**IMPORTANT: You must end your evaluation with a clear overall rating from 1-10, formatted exactly as "Overall Rating: X/10" where X is the numeric score. Unless the answer would take >15 mins to read, do not deduct for conciseness.**

Use this scale:
- 9-10: Exceptional answer with compelling examples that are easy to understand. They have strong structure and show high compence.
- 7-8: Strong answer with good examples and clear structure
- 5-6: Adequate answer but lacking detail or structure
- 3-4: Weak answer with minimal examples or poor structure  
- 1-2: Poor answer that doesn't address the question

Format your response in markdown with clear sections.`;

    const evaluationResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.7,
    });

    const evaluation = evaluationResponse.choices[0].message.content;
    
    // Extract rating from evaluation
    const rating = extractRating(evaluation);

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
      rating,
      matchedExperience,
      suggestedUpdate,
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 