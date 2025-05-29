import mongoose from 'mongoose';
import { createMocks } from 'node-mocks-http';
import Experience from '../models/Experience';
import addHandler from '../pages/api/experiences/add';
import searchHandler from '../pages/api/experiences/search';

// Mock OpenAI embeddings
jest.mock('../lib/openai', () => ({
  generateEmbedding: jest.fn().mockResolvedValue(Array(1536).fill(0.1))
}));

describe('Experience API', () => {
  // Setup test data
  const testExperiences = [
    {
      title: 'React Development',
      description: 'Built a complex React application with Redux',
      embedding: Array(1536).fill(0.2),
      tags: ['react', 'redux'],
    },
    {
      title: 'Node.js API',
      description: 'Developed RESTful API using Node.js and Express',
      embedding: Array(1536).fill(0.3),
      tags: ['nodejs', 'express'],
    },
    {
      title: 'Database Design',
      description: 'Designed and implemented MongoDB schema',
      embedding: Array(1536).fill(0.4),
      tags: ['mongodb', 'database'],
    }
  ];

  beforeEach(async () => {
    // Insert test experiences
    await mongoose.models.Experience.insertMany(testExperiences);
  });

  describe('POST /api/experiences/add', () => {
    it('should create a new experience', async () => {
      const experienceData = {
        title: 'Test Experience',
        description: 'This is a test experience',
        tags: ['test', 'api'],
        date: new Date().toISOString()
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: experienceData,
      });

      await addHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      
      const responseData = JSON.parse(res._getData());
      expect(responseData.title).toBe(experienceData.title);
      expect(responseData.description).toBe(experienceData.description);
      expect(responseData.tags).toEqual(expect.arrayContaining(experienceData.tags));
      expect(responseData.embedding).toBeDefined();
      expect(responseData.embedding.length).toBe(1536);
    });

    it('should fail with invalid data', async () => {
      const invalidData = {
        // Missing required fields
        tags: ['test']
      };

      const { req, res } = createMocks({
        method: 'POST',
        body: invalidData,
      });

      await addHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Failed to add experience');
    });
  });

  describe('GET /api/experiences/search', () => {
    // Note: These tests are skipped because vector search requires MongoDB Atlas
    // They should be run in an integration test environment with Atlas
    it.skip('should return relevant experiences based on query', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'React development frontend' },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('React Development');
    });

    it.skip('should filter experiences by tag', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'database', tags: ['mongodb'] },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tags).toContain('mongodb');
    });

    it.skip('should handle empty search results', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'nonexistent experience' },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Experience Model', () => {
    it('should validate required fields', async () => {
      const invalidExperience = new mongoose.models.Experience({});
      
      let error;
      try {
        await invalidExperience.validate();
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.embedding).toBeDefined();
    });

    it('should create experience with valid data', async () => {
      const validExperience = new mongoose.models.Experience({
        title: 'Valid Experience',
        description: 'This is a valid experience',
        embedding: Array(1536).fill(0.1),
        tags: ['valid', 'test'],
        date: new Date()
      });

      const savedExperience = await validExperience.save();
      expect(savedExperience._id).toBeDefined();
      expect(savedExperience.title).toBe('Valid Experience');
      expect(savedExperience.tags).toHaveLength(2);
    });

    // Note: This test is skipped because vector search requires MongoDB Atlas
    it.skip('should perform vector similarity search', async () => {
      const searchVector = Array(1536).fill(0.2); // Should match closest to first test experience
      
      const results = await mongoose.models.Experience.aggregate([
        {
          $search: {
            knnBeta: {
              vector: searchVector,
              path: 'embedding',
              k: 3,
            }
          }
        }
      ]);

      expect(results.length).toBe(3);
      expect(results[0].title).toBe('React Development');
    });
  });
}); 