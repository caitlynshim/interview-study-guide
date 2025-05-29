import mongoose from 'mongoose';
import { createMocks } from 'node-mocks-http';
import Experience from '../models/Experience';
import searchHandler from '../pages/api/experiences/search';
import { generateEmbedding } from '../lib/openai';
import dbConnect from '../lib/mongodb';

describe('Vector Search Integration Tests', () => {
  // Only run these tests if MONGODB_URI is set to an Atlas connection
  const isAtlasConnection = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv');
  
  if (!isAtlasConnection) {
    it.skip('Skipping vector search tests - requires MongoDB Atlas connection', () => {});
    return;
  }

  beforeAll(async () => {
    await dbConnect();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the experiences collection
    await Experience.deleteMany({});

    // Insert test experiences with real embeddings
    const testExperiences = [
      {
        title: 'React Development',
        description: 'Built a complex React application with Redux and TypeScript',
        tags: ['react', 'redux', 'typescript'],
        date: new Date('2024-01-15'),
      },
      {
        title: 'Node.js API',
        description: 'Developed RESTful API using Node.js, Express, and MongoDB',
        tags: ['nodejs', 'express', 'mongodb'],
        date: new Date('2024-02-01'),
      },
      {
        title: 'Database Design',
        description: 'Designed and implemented MongoDB schema with vector search capabilities',
        tags: ['mongodb', 'database', 'vector-search'],
        date: new Date('2024-03-01'),
      },
      {
        title: 'Frontend Performance',
        description: 'Optimized React application performance using code splitting and lazy loading',
        tags: ['react', 'performance', 'optimization'],
        date: new Date('2024-03-15'),
      },
      {
        title: 'API Security',
        description: 'Implemented JWT authentication and rate limiting in Node.js API',
        tags: ['nodejs', 'security', 'authentication'],
        date: new Date('2024-03-20'),
      }
    ];

    // Generate real embeddings for each test experience
    for (const exp of testExperiences) {
      const embedding = await generateEmbedding(exp.title + ' ' + exp.description);
      exp.embedding = embedding;
    }

    await Experience.insertMany(testExperiences);
  });

  describe('Vector Similarity Search', () => {
    it('should return relevant experiences based on semantic similarity', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'frontend development with React' },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // The first result should be the React experience since the query is about frontend/React
      expect(results[0].title).toBe('React Development');
      expect(results[0].score).toBeDefined();
    });

    it('should combine vector search with tag filtering', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          q: 'database implementation',
          tags: ['mongodb']
        },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Results should only include experiences with mongodb tag
      results.forEach(result => {
        expect(result.tags).toContain('mongodb');
      });
    });

    it('should handle empty search results gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          q: 'machine learning with python', // Query that doesn't match our test data
          tags: ['python']
        },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should return experiences ordered by semantic similarity', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'database systems and MongoDB' },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(1);
      
      // Verify results are ordered by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    // New test cases
    it('should handle multiple tag filtering correctly', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          q: 'web development',
          tags: ['react', 'performance']
        },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Results should have both tags
      results.forEach(result => {
        expect(result.tags).toContain('react');
        expect(result.tags).toContain('performance');
      });
    });

    it('should find semantically similar experiences even with different wording', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'web app speed improvements' }, // Different wording but semantically similar to 'Frontend Performance'
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      // Should find the Frontend Performance experience
      const hasPerformanceExp = results.some(r => r.title === 'Frontend Performance');
      expect(hasPerformanceExp).toBe(true);
    });

    it('should handle malformed queries gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: '   ' }, // Empty query with spaces
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle invalid tag format gracefully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          q: 'development',
          tags: 'invalid-format' // Tags should be an array
        },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(Array.isArray(results)).toBe(true);
    });

    it('should find experiences related to security concepts', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'API authentication and security measures' },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      // Should find the API Security experience
      const hasSecurityExp = results.some(r => r.title === 'API Security');
      expect(hasSecurityExp).toBe(true);
      
      // Security experience should be ranked highly
      expect(results[0].title).toBe('API Security');
    });

    it('should handle date-based context in queries', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          q: 'recent security implementations',
          sort: 'date'
        },
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      
      // Should find security-related experiences
      const hasSecurityExp = results.some(r => r.title === 'API Security');
      expect(hasSecurityExp).toBe(true);
      
      // Results should be in chronological order if sort=date
      for (let i = 1; i < results.length; i++) {
        const prevDate = new Date(results[i-1].date);
        const currDate = new Date(results[i].date);
        expect(prevDate >= currDate).toBe(true);
      }
    });
  });
}); 