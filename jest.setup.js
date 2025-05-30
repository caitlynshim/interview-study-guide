// Load environment variables first, before any other imports
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.test' });

// Now import other modules after environment variables are loaded
const mongoose = require('mongoose');
const connectToDatabase = require('./lib/mongodb');
require('@testing-library/jest-dom');

// Increase the timeout for async operations
jest.setTimeout(10000);

let connection;

beforeAll(async () => {
  connection = await connectToDatabase();
});

beforeEach(async () => {
  if (!mongoose.connection || !mongoose.connection.db) {
    connection = await connectToDatabase();
  }
  // Clear all collections before each test
  const collections = await mongoose.connection.db.collections();
  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterEach(async () => {
  // Ensure all operations are complete
  const models = Object.values(mongoose.connection.models);
  await Promise.all(models.map(model => model.deleteMany({})));
});

afterAll(async () => {
  // Drop the test database after all tests
  if (process.env.NODE_ENV === 'test' && mongoose.connection && mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  // Close all connections
  await mongoose.connection.close();
  // Clear the cached connection
  global.mongoose = undefined;
});

// Set up any other test configurations here 