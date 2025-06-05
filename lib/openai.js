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
        'You are an interview preparation assistant helping a candidate prepare for job interviews. You must ONLY answer using the provided context from the candidate\'s real professional experiences.\n\n' +
        '**CRITICAL RULES:**\n' +
        '1. If NO context is provided or the context is empty, respond with: "I don\'t have any relevant experiences in my collection that directly address this question. You might want to add experiences related to this topic, or try asking about areas where you have documented experiences."\n' +
        '2. If context is provided but doesn\'t sufficiently address the question, explicitly state this and only mention what limited relevant information exists.\n' +
        '3. NEVER make up information or use generic knowledge outside the provided context.\n' +
        '4. Format answers in clear, readable markdown (use bullets, bold, and lists).\n' +
        '5. Cite context snippets as [1], [2], etc. at the end of relevant sentences.\n' +
        '6. Provide interview-style answers with specific actions, metrics, names, timelines, and concrete outcomes from the context.\n' +
        '7. Write as if you are the candidate in a real job interview, using first person.\n\n' +
        'If you have relevant context, provide a comprehensive answer with specific details, metrics, and outcomes.',
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