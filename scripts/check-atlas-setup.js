const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkAtlasSetup() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('interview-prep');
    
    // Check collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:');
    collections.forEach(col => console.log(`- ${col.name}`));

    // Check indexes for questions collection
    console.log('\nIndexes for questions collection:');
    const questionIndexes = await db.collection('questions').listIndexes().toArray();
    questionIndexes.forEach(idx => console.log('- ' + JSON.stringify(idx.name || idx.key)));

    // Check indexes for projects collection
    console.log('\nIndexes for projects collection:');
    const projectIndexes = await db.collection('projects').listIndexes().toArray();
    projectIndexes.forEach(idx => console.log('- ' + JSON.stringify(idx.name || idx.key)));

    // Check if vector search index exists for projects
    console.log('\nVector search indexes for projects:');
    try {
      const searchIndexes = await db.collection('projects').listSearchIndexes().toArray();
      searchIndexes.forEach(idx => {
        console.log(`- ${idx.name}:`);
        console.log(JSON.stringify(idx.definition, null, 2));
      });
    } catch (error) {
      if (error.message.includes('command listSearchIndexes is not supported')) {
        console.log('No vector search indexes found (Atlas Search not enabled)');
      } else {
        throw error;
      }
    }

    // Get document counts
    const questionsCount = await db.collection('questions').countDocuments();
    const projectsCount = await db.collection('projects').countDocuments();
    
    console.log('\nDocument counts:');
    console.log(`- questions: ${questionsCount} documents`);
    console.log(`- projects: ${projectsCount} documents`);

  } catch (error) {
    console.error('Error checking Atlas setup:', error);
  } finally {
    await client.close();
  }
}

checkAtlasSetup().catch(console.error); 