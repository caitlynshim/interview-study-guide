import { createMocks } from 'node-mocks-http';
import mongoose from 'mongoose';
import categoriesHandler from '../../pages/api/questions/categories';
import randomHandler from '../../pages/api/questions/random';
import Question from '../../models/Question';
import connectToDatabase from '../../lib/mongodb';

describe('API Integration', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Question.deleteMany({});
  });

  describe('/api/questions/categories', () => {
    it('should return categories successfully', async () => {
      // Create test questions
      await Question.create([
        { question: 'Test Q1', category: 'Category1', difficulty: 'easy' },
        { question: 'Test Q2', category: 'Category2', difficulty: 'medium' }
      ]);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const categories = JSON.parse(res._getData());
      expect(categories).toEqual(['Category1', 'Category2']);
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      });

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('/api/questions/random', () => {
    it('should return a random question', async () => {
      // Create test questions
      await Question.create([
        { question: 'Test Q1', category: 'Category1', difficulty: 'easy' },
        { question: 'Test Q2', category: 'Category2', difficulty: 'medium' }
      ]);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const question = JSON.parse(res._getData());
      expect(question).toHaveProperty('question');
      expect(question).toHaveProperty('category');
    });

    it('should filter by category', async () => {
      // Create test questions
      await Question.create([
        { question: 'Test Q1', category: 'Category1', difficulty: 'easy' },
        { question: 'Test Q2', category: 'Category2', difficulty: 'medium' }
      ]);

      const { req, res } = createMocks({
        method: 'GET',
        query: { category: 'Category1' },
      });

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const question = JSON.parse(res._getData());
      expect(question.category).toBe('Category1');
    });

    it('should handle no questions found', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { category: 'NonExistentCategory' },
      });

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });
}); 