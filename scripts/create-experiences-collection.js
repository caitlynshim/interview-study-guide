const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function createExperiencesCollection() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db();
    
    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const experiencesExists = collections.some(c => c.name === 'experiences');

    if (experiencesExists) {
      console.log('Experiences collection already exists');
      return;
    }

    // Create experiences collection with validation
    await db.createCollection('experiences', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['type', 'content', 'createdAt'],
          properties: {
            type: {
              bsonType: 'string',
              description: 'Type of experience - required string'
            },
            content: {
              bsonType: 'string',
              description: 'Content of the experience - required string'
            },
            embedding: {
              bsonType: 'array',
              description: 'Vector embedding of the content'
            },
            createdAt: {
              bsonType: 'date',
              description: 'Timestamp of creation - required date'
            }
          }
        }
      }
    });

    console.log('Successfully created experiences collection');

    // Create a sample experience
    const result = await db.collection('experiences').insertOne({
      type: 'technical',
      content: 'Built a full-stack web application using Next.js and MongoDB',
      createdAt: new Date()
    });

    console.log('Added sample experience:', result.insertedId);

  } catch (error) {
    console.error('Error creating experiences collection:', error);
  } finally {
    await client.close();
  }
}

createExperiencesCollection(); 