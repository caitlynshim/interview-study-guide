import { createMocks } from 'node-mocks-http';
import categoriesHandler from '../../pages/api/questions/categories';
import randomHandler from '../../pages/api/questions/random';
import Question from '../../models/Question';
import connectToDatabase from '../../lib/mongodb';

jest.mock('../../lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../models/Question', () => ({
  distinct: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
}));

describe('Questions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/questions/categories', () => {
    it('should return categories successfully', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const mockCategories = ['Category1', 'Category2'];
      Question.distinct.mockResolvedValueOnce(mockCategories);

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockCategories);
      expect(connectToDatabase).toHaveBeenCalledTimes(1);
      expect(Question.distinct).toHaveBeenCalledWith('category');
    });

    it('should handle database errors', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const error = new Error('Database error');
      Question.distinct.mockRejectedValueOnce(error);

      await categoriesHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({ message: 'Internal server error' });
    });
  });

  describe('/api/questions/random', () => {
    it('should return a random question without category filter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const mockQuestion = { 
        question: 'Test question',
        category: 'Test',
        difficulty: 'Medium'
      };

      Question.countDocuments.mockResolvedValueOnce(10);
      Question.findOne.mockResolvedValueOnce(mockQuestion);

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockQuestion);
      expect(connectToDatabase).toHaveBeenCalledTimes(1);
      expect(Question.countDocuments).toHaveBeenCalledWith({});
      expect(Question.findOne).toHaveBeenCalled();
    });

    it('should return a random question with category filter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { category: 'Test' },
      });

      const mockQuestion = {
        question: 'Test question',
        category: 'Test',
        difficulty: 'Medium'
      };

      Question.countDocuments.mockResolvedValueOnce(5);
      Question.findOne.mockResolvedValueOnce(mockQuestion);

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockQuestion);
      expect(Question.countDocuments).toHaveBeenCalledWith({ category: 'Test' });
    });

    it('should handle no questions found', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      Question.countDocuments.mockResolvedValueOnce(0);

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({ message: 'No questions found' });
    });

    it('should handle database errors', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const error = new Error('Database error');
      Question.countDocuments.mockRejectedValueOnce(error);

      await randomHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData())).toEqual({ message: 'Internal server error' });
    });
  });
}); 