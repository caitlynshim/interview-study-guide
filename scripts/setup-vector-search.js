const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupVectorSearch() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('interview-prep');
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Existing collections:', collections.map(c => c.name));
    
    const experiencesCollection = collections.find(c => c.name === 'experiences');

    if (!experiencesCollection) {
      console.log('Experiences collection not found. Creating it...');
      await db.createCollection('experiences');
      console.log('Created experiences collection');
    } else {
      console.log('Found existing experiences collection');
    }

    // Check if vector search index already exists
    const indexes = await db.collection('experiences').listIndexes().toArray();
    console.log('Existing indexes:', indexes.map(idx => idx.name));
    
    const vectorIndex = indexes.find(idx => idx.name === 'vector_search');

    if (vectorIndex) {
      console.log('Vector search index already exists');
      process.exit(0);
    }

    // Create vector search index
    const result = await db.collection('experiences').createIndex(
      { embedding: "vector" },
      {
        name: "vector_search",
        vectorSearchOptions: {
          numDimensions: 1536, // Dimensions for text-embedding-3-small model
          similarity: "cosine"  // Use cosine similarity for text embeddings
        }
      }
    );

    console.log('Vector search index created:', result);

    // Verify the index was created
    const updatedIndexes = await db.collection('experiences').listIndexes().toArray();
    const createdIndex = updatedIndexes.find(idx => idx.name === 'vector_search');

    if (!createdIndex) {
      throw new Error('Failed to verify index creation');
    }

    console.log('Vector search index verified and ready to use');
  } catch (error) {
    console.error('Error setting up vector search:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupVectorSearch(); 