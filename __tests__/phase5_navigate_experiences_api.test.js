import { createMocks } from 'node-mocks-http';

// Mock the database connection
jest.mock('../lib/dbConnect', () => jest.fn().mockResolvedValue({}));

// Mock the Experience model
const mockFind = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockExperience = {
  find: mockFind,
  findByIdAndUpdate: mockFindByIdAndUpdate,
};
jest.mock('../models/Experience', () => mockExperience);

// Mock OpenAI functions
jest.mock('../lib/openai', () => ({
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  generateCategory: jest.fn().mockResolvedValue('Generated Category'),
}));

describe('Phase 5 – Navigate Experiences API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('/api/experiences/list', () => {
    // Import handler after mocks
    const listHandler = require('../pages/api/experiences/list').default;

    const mockExperiences = [
      {
        _id: 'exp1',
        title: 'Leadership Challenge',
        content: 'Led a team through difficult project...',
        metadata: {
          category: 'Leadership',
          tags: ['leadership', 'teamwork'],
          role: 'Senior Manager',
        },
        createdAt: '2023-06-15T10:00:00Z',
        updatedAt: '2023-06-15T10:00:00Z',
      },
      {
        _id: 'exp2',
        title: 'Technical Architecture',
        content: 'Designed a scalable system...',
        metadata: {
          category: 'Technical',
          tags: ['architecture'],
        },
        createdAt: '2023-06-16T10:00:00Z',
        updatedAt: '2023-06-16T10:00:00Z',
      },
    ];

    it('returns all experiences when no category filter', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockExperiences),
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await listHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.experiences).toHaveLength(2);
      expect(responseData.experiences[0].title).toBe('Leadership Challenge');
      expect(responseData.experiences[1].title).toBe('Technical Architecture');

      // Should query with empty filter
      expect(mockFind).toHaveBeenCalledWith({});
    });

    it('filters experiences by category', async () => {
      const filteredExperiences = [mockExperiences[0]]; // Only Leadership
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(filteredExperiences),
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { category: 'Leadership' },
      });

      await listHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.experiences).toHaveLength(1);
      expect(responseData.experiences[0].title).toBe('Leadership Challenge');

      // Should query with category filter
      expect(mockFind).toHaveBeenCalledWith({ 'metadata.category': 'Leadership' });
    });

    it('treats "All" category as no filter', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockExperiences),
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { category: 'All' },
      });

      await listHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.experiences).toHaveLength(2);

      // Should query with empty filter (All = no filter)
      expect(mockFind).toHaveBeenCalledWith({});
    });

    it('maps experience data correctly', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockExperiences[0]]),
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await listHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      const exp = responseData.experiences[0];
      
      expect(exp._id).toBe('exp1');
      expect(exp.title).toBe('Leadership Challenge');
      expect(exp.content).toBe('Led a team through difficult project...');
      expect(exp.category).toBe('Leadership');
      expect(exp.metadata).toEqual({
        category: 'Leadership',
        tags: ['leadership', 'teamwork'],
        role: 'Senior Manager',
      });
      expect(exp.createdAt).toBe('2023-06-15T10:00:00Z');
      expect(exp.updatedAt).toBe('2023-06-15T10:00:00Z');
    });

    it('handles database error gracefully', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await listHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Error fetching experiences');
      expect(responseData.error).toBe('Database connection failed');
    });

    it('sorts experiences by title', async () => {
      mockFind.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockExperiences),
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await listHandler(req, res);

      // Should call sort with title ascending
      expect(mockFind().sort).toHaveBeenCalledWith({ title: 1 });
    });
  });

  describe('/api/experiences/edit', () => {
    // Import handler after mocks
    const editHandler = require('../pages/api/experiences/edit').default;

    it('returns 405 for non-PUT methods', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Method not allowed'
      });
    });

    it('returns 400 for missing id', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: {},
        body: { title: 'Test', content: 'Test content' },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Missing required fields'
      });
    });

    it('returns 400 for missing title', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: { content: 'Test content' },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Missing required fields'
      });
    });

    it('returns 400 for missing content', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: { title: 'Test Title' },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Missing required fields'
      });
    });

    it('successfully updates experience with valid data', async () => {
      const updatedExperience = {
        _id: 'exp1',
        title: 'Updated Leadership Challenge',
        content: 'Updated content...',
        metadata: { category: 'Generated Category' },
        embedding: [0.1, 0.2, 0.3],
      };

      mockFindByIdAndUpdate.mockResolvedValue(updatedExperience);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: {
          title: 'Updated Leadership Challenge',
          content: 'Updated content...',
        },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Experience updated');
      expect(responseData.experience).toEqual(updatedExperience);

      // Should call findByIdAndUpdate with correct parameters
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'exp1',
        {
          title: 'Updated Leadership Challenge',
          content: 'Updated content...',
          metadata: { category: 'Generated Category' },
          embedding: [0.1, 0.2, 0.3],
        },
        { new: true }
      );
    });

    it('uses provided category instead of generating', async () => {
      const updatedExperience = {
        _id: 'exp1',
        title: 'Test Title',
        content: 'Test content',
        metadata: { category: 'Provided Category' },
        embedding: [0.1, 0.2, 0.3],
      };

      mockFindByIdAndUpdate.mockResolvedValue(updatedExperience);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: {
          title: 'Test Title',
          content: 'Test content',
          metadata: { category: 'Provided Category' },
        },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.experience.metadata.category).toBe('Provided Category');

      // Should use provided category, not generate new one
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'exp1',
        expect.objectContaining({
          metadata: { category: 'Provided Category' },
        }),
        { new: true }
      );
    });

    it('returns 404 when experience not found', async () => {
      mockFindByIdAndUpdate.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'nonexistent' },
        body: {
          title: 'Test Title',
          content: 'Test content',
        },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Experience not found'
      });
    });

    it('handles database connection error', async () => {
      // Mock database connection to fail
      const dbConnect = require('../lib/dbConnect');
      dbConnect.mockRejectedValueOnce(new Error('Database connection failed'));

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: {
          title: 'Test Title',
          content: 'Test content',
        },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Failed to update experience');
      expect(responseData.error).toBe('Database connection failed');
    });

    it('generates embedding for updated content', async () => {
      const updatedExperience = {
        _id: 'exp1',
        title: 'Test Title',
        content: 'Test content',
        metadata: { category: 'Generated Category' },
        embedding: [0.1, 0.2, 0.3],
      };

      mockFindByIdAndUpdate.mockResolvedValue(updatedExperience);

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: {
          title: 'Test Title',
          content: 'Test content',
        },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(200);

      // Should generate embedding for title + content
      const { generateEmbedding } = require('../lib/openai');
      expect(generateEmbedding).toHaveBeenCalledWith('Test Title\nTest content');

      // Should save with generated embedding
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        'exp1',
        expect.objectContaining({
          embedding: [0.1, 0.2, 0.3],
        }),
        { new: true }
      );
    });

    it('returns 500 when embedding generation fails', async () => {
      const { generateEmbedding } = require('../lib/openai');
      generateEmbedding.mockRejectedValue(new Error('OpenAI API failed'));

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: 'exp1' },
        body: {
          title: 'Test Title',
          content: 'Test content',
        },
      });

      await editHandler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toBe('Failed to re-embed experience');
      expect(responseData.error).toBe('OpenAI API failed');
    });
  });
}); 