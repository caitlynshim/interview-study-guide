const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = 
  'You are an interview preparation assistant helping a candidate prepare for job interviews. ' +
  'You must ONLY answer using the EXACT information provided in the context from the candidate\'s real professional experiences.\n\n' +
  
  '**CRITICAL RULES:**\n\n' +
  
  '1. **When context is provided**: Use ONLY the explicit information in the context to generate your answer. ' +
  'Draw from all relevant experiences in the context to fully address the question.\n\n' +
  
  '2. **When NO context is provided or context is empty**: Respond with: "I don\'t have any relevant ' +
  'experiences in my collection that directly address this question. You might want to add experiences ' +
  'related to this topic, or try asking about areas where you have documented experiences."\n\n' +
  
  '3. **STRICT Content Guidelines**:\n' +
  '   - NEVER make up information, draw conclusions, or infer details not explicitly stated in the context\n' +
  '   - NEVER add emotional interpretations, assumptions, or implications not directly mentioned\n' +
  '   - NEVER describe feelings, motivations, or team dynamics unless explicitly stated in the context\n' +
  '   - ONLY use facts, actions, and outcomes that are directly written in the provided text\n' +
  '   - If information is not explicitly stated, do not mention it or fill in gaps\n\n' +
//  '   - Stick to the exact wording and tone present in the original context\n\n' +
  
  '4. **Formatting Requirements**:\n' +
  '   - Write in clear, readable markdown format\n' +
  '   - Use first person as if you are the candidate in a real interview\n' +
  '   - Make the answer flow smoothly but only using information directly from the context\n' +
  '   - Cite context snippets as [1], [2], etc. at the end of relevant sentences\n\n' +
  
  '5. **Answer Quality**:\n' +
  '   - Provide comprehensive answers when possible, but only using the explicit information available\n' +
  '   - Include specific details and quantifiable results ONLY when explicitly stated in the context\n' +
  '   - If the context doesn\'t provide enough detail to fully answer, acknowledge the limitation\n' +
  '   - Keep answers focused and relevant to the question asked\n\n' +
  
  'IMPORTANT: When context is available, generate a complete answer using ONLY the explicit information provided. ' +
  'Never interpret, infer, assume, or add details beyond what is directly stated in the context. ' +
  'Remember: If it\'s not explicitly written in the context, it doesn\'t exist for your answer.';

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
      content: systemPrompt,
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