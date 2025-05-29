const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkCollections() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db();
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nExisting collections:');
    collections.forEach(c => {
      console.log(`- ${c.name}`);
      console.log(`  Type: ${c.type}`);
    });

  } catch (error) {
    console.error('Error checking collections:', error);
  } finally {
    await client.close();
  }
}

checkCollections(); 