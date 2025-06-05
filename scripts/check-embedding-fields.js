const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkIndexes() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('test');
    const collection = db.collection('experiences');
    
    console.log('=== CHECKING VECTOR SEARCH SETUP ===');
    
    // Check if documents have the embeddingBin field that the API is looking for
    const sampleDoc = await collection.findOne({});
    if (sampleDoc) {
      console.log('Sample document fields:', Object.keys(sampleDoc));
      console.log('Has embedding:', sampleDoc.embedding ? 'YES' : 'NO');
      console.log('Has embeddingBin:', sampleDoc.embeddingBin ? 'YES' : 'NO');
      
      if (sampleDoc.embedding) {
        console.log('Embedding type:', typeof sampleDoc.embedding[0]);
        console.log('Embedding length:', sampleDoc.embedding.length);
      }
      
      if (sampleDoc.embeddingBin) {
        console.log('EmbeddingBin type:', typeof sampleDoc.embeddingBin);
      }
    }
    
    // Check how many have embeddingBin vs embedding
    const withEmbeddingBin = await collection.countDocuments({ embeddingBin: { $exists: true } });
    const withEmbedding = await collection.countDocuments({ embedding: { $exists: true } });
    
    console.log('\n=== FIELD COUNT ===');
    console.log('Documents with embeddingBin:', withEmbeddingBin);
    console.log('Documents with embedding:', withEmbedding);
    
  } finally {
    await client.close();
  }
}

checkIndexes().catch(console.error); 