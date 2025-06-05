const dbConnect = require('../lib/mongodb');
const Experience = require('../models/Experience');

async function checkEmbeddings() {
  try {
    await dbConnect();
    console.log('Connected to database');
    
    // Get all experiences and check for embeddings
    const experiences = await Experience.find({}).limit(3);
    
    console.log(`Found ${experiences.length} experiences`);
    
    experiences.forEach((exp, index) => {
      console.log(`\nExperience ${index + 1}:`);
      console.log(`  ID: ${exp._id}`);
      console.log(`  Title: ${exp.title}`);
      console.log(`  Has embedding: ${!!exp.embedding}`);
      console.log(`  Embedding type: ${typeof exp.embedding}`);
      console.log(`  Embedding length: ${exp.embedding ? exp.embedding.length : 'N/A'}`);
      if (exp.embedding && exp.embedding.length > 0) {
        console.log(`  First few values: [${exp.embedding.slice(0, 5).join(', ')}, ...]`);
      }
    });
    
    // Test vector search pipeline
    console.log('\nTesting vector search pipeline...');
    const testEmbedding = Array(1536).fill(0.1); // Test embedding
    
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_search',
          queryVector: testEmbedding,
          path: 'embedding',
          numCandidates: 10,
          limit: 3,
        },
      },
      { $project: { content: 1, title: 1, _id: 1, embedding: 1 } },
    ];
    
    try {
      const vectorResults = await Experience.aggregate(pipeline);
      console.log(`Vector search returned ${vectorResults.length} results`);
      vectorResults.forEach((result, index) => {
        console.log(`  Result ${index + 1}: ${result.title}`);
        console.log(`    Has embedding: ${!!result.embedding}`);
      });
    } catch (vectorError) {
      console.log('Vector search failed:', vectorError.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkEmbeddings(); 