import mongoose from 'mongoose';
import connectToDatabase from '../../lib/mongodb';

describe('MongoDB Integration', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should connect to MongoDB successfully', () => {
    expect(mongoose.connection.readyState).toBe(1); // Connected
  });

  it('should reuse existing connection', async () => {
    const firstConnection = await connectToDatabase();
    const secondConnection = await connectToDatabase();
    expect(firstConnection).toBe(secondConnection);
  });

  it('should handle connection errors gracefully', async () => {
    // Save the original URI
    const originalUri = process.env.MONGODB_URI;
    
    // Set an invalid URI
    process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
    
    // Reset the cached connection
    global.mongoose = undefined;
    
    await expect(connectToDatabase()).rejects.toThrow();
    
    // Restore the original URI
    process.env.MONGODB_URI = originalUri;
  });
}); 