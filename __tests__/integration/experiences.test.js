import { createMocks } from 'node-mocks-http';
import mongoose from 'mongoose';
import addHandler from '../../pages/api/experiences/add';
import searchHandler from '../../pages/api/experiences/search';
import Experience from '../../models/Experience';
import connectToDatabase from '../../lib/mongodb';

describe('Experiences API Integration', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Experience.deleteMany({});
  });

  describe('/api/experiences/add', () => {
    it('should add a new experience', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          title: 'Test Experience',
          description: 'Test Description',
          content: 'Test Content',
          tags: ['test', 'integration']
        }
      });

      await addHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('_id');
      expect(data.title).toBe('Test Experience');
    });

    it('should validate required fields', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          description: 'Missing Title'
        }
      });

      await addHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('/api/experiences/search', () => {
    beforeEach(async () => {
      await Experience.create([
        {
          title: 'Frontend Experience',
          description: 'React development',
          content: 'Built a web app',
          tags: ['react', 'frontend']
        },
        {
          title: 'Backend Experience',
          description: 'Node.js development',
          content: 'Built an API',
          tags: ['node', 'backend']
        }
      ]);
    });

    it('should search experiences by query', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'frontend' }
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Frontend Experience');
    });

    it('should filter experiences by tags', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { tags: ['backend'] }
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Backend Experience');
    });

    it('should handle no results', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'nonexistent' }
      });

      await searchHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const results = JSON.parse(res._getData());
      expect(results.length).toBe(0);
    });
  });
}); 