const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupProjectsCollection() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('interview-prep');
    
    // Create projects collection if it doesn't exist
    try {
      await db.createCollection('projects');
      console.log('Created projects collection');
    } catch (error) {
      if (!error.message.includes('Collection already exists')) {
        throw error;
      }
      console.log('Projects collection already exists');
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

    try {
      await db.collection('projects').dropSearchIndex('vector_search');
      console.log('Dropped existing vector search index');
    } catch (error) {
      // Ignore if index doesn't exist
      if (!error.message.includes('index not found')) {
        throw error;
      }
    }

    await db.collection('projects').createSearchIndex(indexDefinition);
    console.log('Created vector search index');

    // Verify the index was created
    const indexes = await db.collection('projects').listSearchIndexes().toArray();
    const vectorIndex = indexes.find(idx => idx.name === 'vector_search');
    
    if (vectorIndex) {
      console.log('Vector search index verified:', vectorIndex);
    } else {
      throw new Error('Vector search index not found after creation');
    }

  } catch (error) {
    console.error('Error setting up projects collection:', error);
    throw error;
  } finally {
    await client.close();
  }
}

setupProjectsCollection().catch(console.error); 