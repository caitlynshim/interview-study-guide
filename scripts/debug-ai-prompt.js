require('dotenv').config({ path: '.env.local' });
const { generateEmbedding } = require('../lib/openai');
const { MongoClient } = require('mongodb');

// Copy the exact generateAnswer function but with logging
async function generateAnswerWithLogging({ question, context }) {
  const messages = [
    {
      role: 'system',
      content:
        'You are an interview preparation assistant helping a candidate prepare for job interviews. You must ONLY answer using the provided context from the candidate\'s real professional experiences.\n\n' +
        '**CRITICAL RULES:**\n' +
        '2. When generating an answer, generate one comprehensive answer. You can weave together multiple related experiences to answer the question (e.g., two about the same project). You can also use the context to answer the question.\n' +
        '3. NEVER make up information or use generic knowledge outside the provided context.\n' +
        '4. Format answers in clear, readable markdown.\n' +
        '5. Cite context snippets as [1], [2], etc. at the end of the answer. \n' +
        '6. Provide interview-style answers in narrative formatwith specific actions, metrics, names, timelines, and concrete outcomes from the context. \n' +
        '7. Write as if you are the candidate in a real job interview, using first person. The answer should flow smoothly as if the user was speaking it.\n\n',
    },
    {
      role: 'user',
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  console.log('=== AI PROMPT DEBUG ===');
  console.log('SYSTEM MESSAGE:');
  console.log(messages[0].content);
  console.log('\n=== USER MESSAGE ===');
  console.log(messages[1].content);
  console.log('\n=== CONTEXT LENGTH ===');
  console.log(`Context character count: ${context.length}`);
  console.log(`Context is empty: ${context.trim() === ''}`);
  console.log(`Context exists: ${!!context && context.trim().length > 0}`);
  
  return 'DEBUG - Not calling OpenAI';
}

async function debugPrompt() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('test');
    const collection = db.collection('experiences');
    
    const question = "Tell me about a time you inherited technical debt";
    
    // Get the AWS Config story
    const awsConfig = await collection.findOne({ 
      title: { $regex: /AWS Config Infrastructure/i }
    });
    
    if (awsConfig) {
      console.log('Found AWS Config story for debugging');
      const context = `(1) ${awsConfig.title}: ${awsConfig.content}`;
      
      await generateAnswerWithLogging({ question, context });
    } else {
      console.log('AWS Config story not found');
    }
    
  } finally {
    await client.close();
  }
}

debugPrompt().catch(console.error); 