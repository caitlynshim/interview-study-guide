const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function moveQuestions() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    // Source database (test) and collection
    const sourceDb = client.db('test');
    const questions = await sourceDb.collection('questions').find({}).toArray();
    console.log(`Found ${questions.length} questions in test database`);

    // Target database (interview-prep) and collection
    const targetDb = client.db('interview-prep');
    
    // Create collection in new database
    try {
      await targetDb.createCollection('questions');
      console.log('Created questions collection in interview-prep database');
    } catch (e) {
      if (e.code === 48) { // Collection already exists
        console.log('Questions collection already exists in interview-prep database');
      } else {
        throw e;
      }
    }

    // Insert documents into new collection if there are any
    if (questions.length > 0) {
      const result = await targetDb.collection('questions').insertMany(questions);
      console.log(`Moved ${questions.length} questions to interview-prep database`);
    }

    // Drop old collection
    await sourceDb.collection('questions').drop();
    console.log('Dropped questions collection from test database');

  } catch (error) {
    console.error('Error moving questions:', error);
  } finally {
    await client.close();
  }
}

moveQuestions(); 