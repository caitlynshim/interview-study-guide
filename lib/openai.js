import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Exponential backoff settings
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay with exponential backoff and jitter
 */
function getRetryDelay(retryCount) {
  const baseDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  );
  // Add random jitter ±100ms
  return baseDelay + Math.random() * 200 - 100;
}

/**
 * Generate embeddings for a text using OpenAI's API with retry logic
 */
export async function generateEmbedding(text) {
  let retryCount = 0;

  while (true) {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      });
      return response.data[0].embedding;
    } catch (error) {
      if (error.status === 429 && retryCount < MAX_RETRIES) {
        // Rate limit hit - implement exponential backoff
        retryCount++;
        const delay = getRetryDelay(retryCount);
        console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
}

/**
 * Generate an interview answer based on the question and relevant experiences
 */
export async function generateAnswer(question, experiences) {
  try {
    const systemPrompt = `You are an expert interview coach helping prepare an answer to the following question. 
Use the provided personal experiences to craft a detailed, specific answer using the STAR method (Situation, Task, Action, Result).
Focus on demonstrating impact and learnings. Keep the answer concise but impactful.`;

    const experienceContext = experiences.map(exp => 
      `${exp.type.toUpperCase()}: ${exp.title}\n${exp.description}`
    ).join('\n\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Question: ${question}\n\nRelevant Experiences:\n${experienceContext}` }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating answer:', error);
    throw error;
  }
} 