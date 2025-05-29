const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function moveToProperDb() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    // Source database (test) and collection
    const sourceDb = client.db('test');
    const experiences = await sourceDb.collection('experiences').find({}).toArray();
    console.log(`Found ${experiences.length} experiences in test database`);

    // Target database (interview-prep) and collection
    const targetDb = client.db('interview-prep');
    
    // Create collection in new database
    try {
      await targetDb.createCollection('experiences', {
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
      console.log('Created experiences collection in interview-prep database');
    } catch (e) {
      if (e.code === 48) { // Collection already exists
        console.log('Collection already exists in interview-prep database');
      } else {
        throw e;
      }
    }

    // Insert documents into new collection if there are any
    if (experiences.length > 0) {
      const result = await targetDb.collection('experiences').insertMany(experiences);
      console.log(`Moved ${experiences.length} experiences to interview-prep database`);
    }

    // Drop old collection
    await sourceDb.collection('experiences').drop();
    console.log('Dropped collection from test database');

    // Update connection string in .env.local
    const fs = require('fs');
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const newContent = envContent.replace(
      /MONGODB_URI=(.*)/,
      `MONGODB_URI=${process.env.MONGODB_URI.split('?')[0]}/interview-prep?${process.env.MONGODB_URI.split('?')[1]}`
    );
    fs.writeFileSync('.env.local', newContent);
    console.log('Updated MONGODB_URI in .env.local to use interview-prep database');

  } catch (error) {
    console.error('Error moving collection:', error);
  } finally {
    await client.close();
  }
}

moveToProperDb(); 