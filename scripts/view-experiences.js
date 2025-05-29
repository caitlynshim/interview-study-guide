const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function viewExperiences() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db();
    const experiences = await db.collection('experiences').find({}).toArray();
    
    console.log('\nExperiences in collection:');
    experiences.forEach((exp, index) => {
      console.log(`\n${index + 1}. Experience:`);
      console.log('  Type:', exp.type);
      console.log('  Content:', exp.content);
      console.log('  Created:', exp.createdAt);
      console.log('  Has Embedding:', !!exp.embedding);
    });

    console.log('\nTotal experiences:', experiences.length);

  } catch (error) {
    console.error('Error viewing experiences:', error);
  } finally {
    await client.close();
  }
}

viewExperiences(); 