const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function debugRagIssue() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('test');
    const collection = db.collection('experiences');
    
    console.log('=== EXPERIENCES CHECK (TEST DATABASE) ===');
    const count = await collection.countDocuments();
    console.log(`Total experiences: ${count}`);
    
    // Check for the specific story mentioned
    const awsConfig = await collection.findOne({ 
      $or: [
        { title: { $regex: /AWS Config/i } },
        { content: { $regex: /AWS Config/i } }
      ]
    });
    
    if (awsConfig) {
      console.log('\n=== AWS CONFIG STORY FOUND ===');
      console.log(`Title: ${awsConfig.title}`);
      console.log(`Content preview: ${awsConfig.content.substring(0, 200)}...`);
      console.log(`Has embedding: ${awsConfig.embedding ? 'YES' : 'NO'}`);
      if (awsConfig.embedding) {
        console.log(`Embedding length: ${awsConfig.embedding.length}`);
        console.log(`Embedding type: ${typeof awsConfig.embedding[0]}`);
      }
    } else {
      console.log('\n=== AWS CONFIG STORY NOT FOUND ===');
    }
    
    // Check for technical debt related content
    const techDebtStories = await collection.find({
      $or: [
        { content: { $regex: /technical debt/i } },
        { content: { $regex: /inherited.*code/i } },
        { content: { $regex: /legacy.*system/i } },
        { content: { $regex: /inherited.*system/i } }
      ]
    }).toArray();
    
    console.log(`\n=== TECHNICAL DEBT RELATED STORIES: ${techDebtStories.length} ===`);
    techDebtStories.forEach((story, idx) => {
      console.log(`${idx + 1}. ${story.title}`);
      console.log(`   Has embedding: ${story.embedding ? 'YES' : 'NO'}`);
      console.log(`   Content preview: ${story.content.substring(0, 150)}...`);
    });
    
    // Check embedding status across all experiences
    const withEmbeddings = await collection.countDocuments({ embedding: { $exists: true, $ne: null } });
    const withoutEmbeddings = await collection.countDocuments({ embedding: { $exists: false } });
    const withNullEmbeddings = await collection.countDocuments({ embedding: null });
    
    console.log('\n=== EMBEDDING STATUS ===');
    console.log(`With embeddings: ${withEmbeddings}`);
    console.log(`Without embeddings: ${withoutEmbeddings}`);
    console.log(`With null embeddings: ${withNullEmbeddings}`);
    
    // List all experience titles if there are any
    if (count > 0) {
      console.log('\n=== ALL EXPERIENCE TITLES ===');
      const allExperiences = await collection.find({}, { title: 1 }).toArray();
      allExperiences.forEach((exp, idx) => {
        console.log(`${idx + 1}. ${exp.title}`);
      });
    }
    
  } finally {
    await client.close();
  }
}

debugRagIssue().catch(console.error); 