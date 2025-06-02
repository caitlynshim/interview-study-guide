const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateEmbedding(input) {
  const resp = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input,
  });
  return resp.data[0].embedding;
}

async function generateAnswer({ question, context }) {
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

async function generateCategory({ title, content }) {
  const prompt = `Given the following interview experience, suggest the most appropriate behavioral or technical category (e.g., Leadership, Technical Trade-offs, Customer Focus, Operational Excellence, Data & Decision Quality, etc.). Respond with only the category name, no explanation.\n\nTitle: ${title}\nContent: ${content}`;
  const resp = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are an expert interview coach. Given an experience, you will assign the best-fit category from common behavioral or technical interview themes. Respond with only the category name.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    max_tokens: 16,
  });
  return resp.choices[0].message.content.trim();
}

module.exports = {
  openai,
  generateEmbedding,
  generateAnswer,
  generateCategory,
}; 