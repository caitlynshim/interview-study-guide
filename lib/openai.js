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
      content: 'You are an interview preparation assistant. Use the provided context to answer the user question as helpfully as possible.',
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