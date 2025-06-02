import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(input) {
  const resp = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input,
  });
  return resp.data[0].embedding;
}

export async function generateAnswer({ question, context }) {
  const messages = [
    {
      role: 'system',
      content:
        'You are an interview preparation assistant. You must answer ONLY using the provided context, which comes from the user\'s real experiences. Do not make up information or use generic knowledge. Format your answer in clear, readable markdown (use bullets, bold, and lists where appropriate). Cite the context snippets you use as [1], [2], etc. at the end of each relevant sentence or bullet.\n\nIMPORTANT: Provide a highly detailed, interview-style answer. Include specific actions, metrics, names, timelines, and concrete outcomes. Always include the specific project names mentioned in the context. Write as if you are the user in a real job interview, giving as much detail as possible. If the context is insufficient, say so explicitly.',
    },
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];
  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    temperature: 0.3,
  });
  return resp.choices[0].message.content.trim();
}

export default openai; 