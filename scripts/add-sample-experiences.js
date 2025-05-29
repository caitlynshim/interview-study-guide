const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const sampleExperiences = [
  {
    type: 'technical',
    content: 'Implemented a real-time chat feature using WebSocket and Redis pub/sub',
    createdAt: new Date()
  },
  {
    type: 'behavioral',
    content: 'Led a team of 5 developers to deliver a critical project under tight deadline',
    createdAt: new Date()
  },
  {
    type: 'technical',
    content: 'Optimized database queries resulting in 50% reduction in API response time',
    createdAt: new Date()
  }
];

async function addSampleExperiences() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db();
    const result = await db.collection('experiences').insertMany(sampleExperiences);
    
    console.log('Successfully added sample experiences');
    console.log('Inserted IDs:', result.insertedIds);

  } catch (error) {
    console.error('Error adding sample experiences:', error);
  } finally {
    await client.close();
  }
}

addSampleExperiences(); 