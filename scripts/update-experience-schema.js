const mongoose = require('mongoose');
const { config } = require('dotenv');
const { resolve } = require('path');

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function updateExperienceSchema() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the experiences collection
    await mongoose.connection.db.collection('experiences').drop();
    console.log('Dropped experiences collection');

    // The collection will be recreated automatically when new documents are inserted
    // with the updated schema from models/Experience.js

    console.log('Schema update complete');
    process.exit(0);
  } catch (error) {
    console.error('Error updating schema:', error);
    process.exit(1);
  }
}

updateExperienceSchema(); 