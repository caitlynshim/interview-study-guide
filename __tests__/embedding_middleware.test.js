const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Mock OpenAI before importing Experience model
jest.mock('../lib/openai', () => ({
  generateEmbedding: jest.fn(),
}));

// Mock dbConnect
jest.mock('../lib/dbConnect', () => jest.fn());

const Experience = require('../models/Experience');
const { generateEmbedding } = require('../lib/openai');

describe('Experience Model Middleware - Embedding Regeneration', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Experience.deleteMany({});
    jest.clearAllMocks();
    generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]); // Mock embedding response
  });

  it('should regenerate embedding when title is modified', async () => {
    // Create experience
    const exp = new Experience({
      title: 'Original Title',
      content: 'Test content',
      embedding: [0, 0, 0]
    });
    await exp.save();

    expect(generateEmbedding).toHaveBeenCalledWith('Original Title\nTest content');

    // Clear mock to test modification
    jest.clearAllMocks();
    generateEmbedding.mockResolvedValue([0.4, 0.5, 0.6]);

    // Modify title
    exp.title = 'Modified Title';
    await exp.save();

    // Should regenerate embedding with new title
    expect(generateEmbedding).toHaveBeenCalledWith('Modified Title\nTest content');
    expect(exp.embedding).toEqual([0.4, 0.5, 0.6]);
  });

  it('should regenerate embedding when content is modified', async () => {
    const exp = new Experience({
      title: 'Test Title',
      content: 'Original content',
      embedding: [0, 0, 0]
    });
    await exp.save();

    jest.clearAllMocks();
    generateEmbedding.mockResolvedValue([0.7, 0.8, 0.9]);

    // Modify content
    exp.content = 'Modified content';
    await exp.save();

    expect(generateEmbedding).toHaveBeenCalledWith('Test Title\nModified content');
    expect(exp.embedding).toEqual([0.7, 0.8, 0.9]);
  });

  it('should NOT regenerate embedding when only metadata is modified', async () => {
    const exp = new Experience({
      title: 'Test Title',
      content: 'Test content',
      embedding: [0.1, 0.2, 0.3],
      metadata: { category: 'Original Category' }
    });
    await exp.save();

    jest.clearAllMocks();

    // Modify only metadata
    exp.metadata.category = 'New Category';
    exp.markModified('metadata');
    await exp.save();

    // Should NOT regenerate embedding
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(exp.embedding).toEqual([0.1, 0.2, 0.3]);
  });

  it('should handle embedding generation errors gracefully', async () => {
    generateEmbedding.mockRejectedValue(new Error('OpenAI API failed'));

    const exp = new Experience({
      title: 'Test Title',
      content: 'Test content',
      embedding: [0, 0, 0]
    });

    // Should throw error when embedding generation fails
    await expect(exp.save()).rejects.toThrow('OpenAI API failed');
  });

  it('should update updatedAt timestamp when embedding is regenerated', async () => {
    const exp = new Experience({
      title: 'Test Title',
      content: 'Test content',
      embedding: [0, 0, 0]
    });
    const originalDate = new Date('2023-01-01');
    exp.updatedAt = originalDate;
    await exp.save();

    jest.clearAllMocks();

    // Modify content
    exp.content = 'Modified content';
    await exp.save();

    // updatedAt should be updated
    expect(exp.updatedAt).not.toEqual(originalDate);
    expect(exp.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
  });
}); 