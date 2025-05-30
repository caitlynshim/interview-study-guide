const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupVectorSearch() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('interview-prep');
    
    // Check if Atlas Search is enabled
    try {
      await db.collection('experiences').listSearchIndexes().toArray();
    } catch (error) {
      if (error.message.includes('command listSearchIndexes is not supported')) {
        console.error('Error: Atlas Search is not enabled for this cluster.');
        console.log('Please enable Atlas Search in your MongoDB Atlas dashboard:');
        console.log('1. Go to your Atlas cluster');
        console.log('2. Click on "Search" tab');
        console.log('3. Click "Create Search Index"');
        process.exit(1);
      }
    }

    // Create vector search index
    const indexDefinition = {
      name: "vector_search",
      definition: {
        mappings: {
          dynamic: true,
          fields: {
            embedding: {
              dimensions: 1536,
              similarity: "cosine",
              type: "knnVector"
            }
          }
        }
      }
    };

    // Check for existing index
    const existingIndexes = await db.collection('experiences').listSearchIndexes().toArray();
    const existingVectorIndex = existingIndexes.find(idx => idx.name === 'vector_search');

    if (existingVectorIndex) {
      console.log('Found existing vector search index. Recreating...');
      await db.collection('experiences').dropSearchIndex('vector_search');
      console.log('Dropped existing vector search index');
    }

    console.log('Creating new vector search index...');
    await db.collection('experiences').createSearchIndex(indexDefinition);
    console.log('Created vector search index');

    // Verify the index was created
    const indexes = await db.collection('experiences').listSearchIndexes().toArray();
    const vectorIndex = indexes.find(idx => idx.name === 'vector_search');
    
    if (vectorIndex) {
      console.log('Vector search index verified:');
      console.log(JSON.stringify(vectorIndex, null, 2));
    } else {
      throw new Error('Vector search index not found after creation');
    }

  } catch (error) {
    console.error('Error setting up vector search:', error);
    throw error;
  } finally {
    await client.close();
  }
}

setupVectorSearch().catch(console.error); 