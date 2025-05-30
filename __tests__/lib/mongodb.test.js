import mongoose from 'mongoose';
import connectToDatabase from '../../lib/mongodb';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('MongoDB Connection', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset the cached connection
    global.mongoose = undefined;
  });

  it('should connect to MongoDB successfully', async () => {
    const mockConnection = { connection: 'test' };
    mongoose.connect.mockResolvedValueOnce(mockConnection);

    const connection = await connectToDatabase();
    expect(connection).toBe(mockConnection);
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI, {
      dbName: 'interview-prep',
      bufferCommands: false,
    });
  });

  it('should reuse existing connection if available', async () => {
    const mockConnection = { connection: 'test' };
    mongoose.connect.mockResolvedValueOnce(mockConnection);

    // First connection
    await connectToDatabase();
    // Second connection should reuse the cached one
    const connection = await connectToDatabase();

    expect(connection).toBe(mockConnection);
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it('should handle connection errors', async () => {
    const error = new Error('Connection failed');
    mongoose.connect.mockRejectedValueOnce(error);

    await expect(connectToDatabase()).rejects.toThrow('Connection failed');
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });
}); 