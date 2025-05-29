import mongoose from 'mongoose';
import { createMocks } from 'node-mocks-http';
import randomHandler from '../pages/api/questions/random';
import categoriesHandler from '../pages/api/questions/categories';

// Sample test questions
const testQuestions = [
  {
    question: 'What is your experience with Node.js?',
    category: 'Technical',
    difficulty: 'Medium'
  },
  {
    question: 'Tell me about a challenging project.',
    category: 'General',
    difficulty: 'Easy'
  },
  {
    question: 'Describe your experience with MongoDB.',
    category: 'Database',
    difficulty: 'Hard'
  }
];

describe('Questions API', () => {
  beforeEach(async () => {
    // Insert test questions into the database
    await mongoose.connection.collection('questions').insertMany(testQuestions);
  });

  describe('GET /api/questions/random', () => {
    it('should return a random question', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const question = JSON.parse(res._getData());
      expect(question).toHaveProperty('question');
      expect(question).toHaveProperty('category');
      expect(question).toHaveProperty('difficulty');
    });

    it('should filter by category', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { category: 'Technical' }
      });

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const question = JSON.parse(res._getData());
      expect(question.category).toBe('Technical');
    });
  });

  describe('GET /api/questions/categories', () => {
    it('should return all unique categories', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const categories = JSON.parse(res._getData());
      expect(categories).toBeInstanceOf(Array);
      expect(categories).toContain('Technical');
      expect(categories).toContain('General');
      expect(categories).toContain('Database');
    });
  });
}); 