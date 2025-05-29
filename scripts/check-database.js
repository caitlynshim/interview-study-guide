const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkDatabase() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    // List all databases
    const dbs = await client.db().admin().listDatabases();
    console.log('\nAvailable databases:');
    dbs.databases.forEach(db => {
      console.log(`- ${db.name} (${db.sizeOnDisk} bytes)`);
    });

    // Get collections from interview-prep database
    const interviewDb = client.db('interview-prep');
    const collections = await interviewDb.listCollections().toArray();
    console.log('\nCollections in interview-prep database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name} (type: ${collection.type})`);
    });

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await client.close();
  }
}

checkDatabase(); 