const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('interview-prep');
    
    // Drop existing collections
    console.log('\nDropping existing collections...');
    await db.collection('questions').drop().catch(() => console.log('questions collection did not exist'));
    await db.collection('experiences').drop().catch(() => console.log('experiences collection did not exist'));
    
    // Create collections
    console.log('\nCreating collections...');
    await db.createCollection('questions');
    await db.createCollection('experiences');
    
    // Create indexes for experiences collection
    console.log('\nCreating indexes for experiences collection...');
    await db.collection('experiences').createIndex(
      { title: 'text', description: 'text', content: 'text' },
      { name: 'text_search' }
    );
    
    await db.collection('experiences').createIndex(
      { tags: 1 },
      { name: 'tags' }
    );
    
    // List all collections and indexes
    console.log('\nCollections:');
    const collections = await db.listCollections().toArray();
    collections.forEach(col => console.log(`- ${col.name}`));
    
    console.log('\nIndexes for experiences collection:');
    const experienceIndexes = await db.collection('experiences').listIndexes().toArray();
    experienceIndexes.forEach(idx => console.log(`- ${JSON.stringify(idx.name || idx.key)}`));
    
    console.log('\nCollections and indexes set up successfully');
    
  } catch (error) {
    console.error('Error setting up collections:', error);
    throw error;
  } finally {
    await client.close();
  }
}

setupCollections().catch(console.error); 