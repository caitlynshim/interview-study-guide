import { createMocks } from 'node-mocks-http';

// Mock the database connection
jest.mock('../lib/dbConnect', () => jest.fn().mockResolvedValue({}));

// Mock the Experience model
const mockSave = jest.fn();
const mockExperience = jest.fn().mockImplementation((data) => ({
  ...data,
  save: mockSave,
}));
jest.mock('../models/Experience', () => mockExperience);

// Import handler after mocks
const handler = require('../pages/api/experiences/add').default;

describe('Phase 4 – Add Experience API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue();
  });

  it('returns 400 for missing title', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { content: 'Some content' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toBe('Validation failed');
    expect(responseData.errors.title).toBe('Title is required.');
  });

  it('returns 400 for missing content', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { title: 'Some title' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const responseData = JSON.parse(res._getData());
    expect(responseData.message).toBe('Validation failed');
    expect(responseData.errors.content).toBe('Content is required.');
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Method not allowed'
    });
  });

  it('attempts to create experience with valid data', async () => {
    // Mock successful save
    const mockDoc = {
      _id: '12345',
      title: 'Leading a Team',
      content: 'I led a cross-functional team...',
      embedding: [0],
      metadata: { category: '', tags: [], role: 'Senior Manager' },
      save: mockSave
    };
    mockExperience.mockReturnValue(mockDoc);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Leading a Team',
        content: 'I led a cross-functional team through a critical project...',
        tags: 'leadership, teamwork',
        role: 'Senior Manager',
        date: '2023-06-15'
      },
    });

    await handler(req, res);

    // The API may fail at embedding generation, but it should at least try to create the experience
    expect(mockExperience).toHaveBeenCalledWith({
      title: 'Leading a Team',
      content: 'I led a cross-functional team through a critical project...',
      embedding: [0],
      metadata: {
        tags: ['leadership', 'teamwork'],
        category: '', // Will be empty due to category generation failure in test env
        role: 'Senior Manager',
        date: new Date('2023-06-15')
      }
    });

    // Should attempt to save the document
    expect(mockSave).toHaveBeenCalled();
  });

  it('uses provided category instead of auto-generating', async () => {
    const mockDoc = {
      _id: '12345',
      title: 'System Design',
      content: 'Designed a distributed system...',
      embedding: [0],
      metadata: { category: 'Technical Architecture', tags: [] },
      save: mockSave
    };
    mockExperience.mockReturnValue(mockDoc);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'System Design',
        content: 'Designed a distributed system...',
        category: 'Technical Architecture' // Category provided
      },
    });

    await handler(req, res);

    // Should use the provided category
    expect(mockExperience).toHaveBeenCalledWith({
      title: 'System Design',
      content: 'Designed a distributed system...',
      embedding: [0],
      metadata: {
        tags: [],
        category: 'Technical Architecture',
        role: undefined,
        date: undefined
      }
    });
  });

  it('parses tags correctly', async () => {
    const mockDoc = {
      _id: '12345',
      title: 'Test',
      content: 'Test content',
      embedding: [0],
      metadata: { category: '', tags: ['tag1', 'tag2', 'tag3'] },
      save: mockSave
    };
    mockExperience.mockReturnValue(mockDoc);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test',
        content: 'Test content',
        tags: 'tag1, tag2,  tag3,  ' // Test trimming and empty filtering
      },
    });

    await handler(req, res);

    // Should parse tags correctly
    expect(mockExperience).toHaveBeenCalledWith({
      title: 'Test',
      content: 'Test content',
      embedding: [0],
      metadata: {
        tags: ['tag1', 'tag2', 'tag3'], // Trimmed and filtered
        category: '', // Will be empty in test environment
        role: undefined,
        date: undefined
      }
    });
  });

  it('handles date parsing correctly', async () => {
    const mockDoc = {
      _id: '12345',
      title: 'Test',
      content: 'Test content',
      embedding: [0],
      metadata: { date: new Date('2023-06-15') },
      save: mockSave
    };
    mockExperience.mockReturnValue(mockDoc);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test',
        content: 'Test content',
        date: '2023-06-15'
      },
    });

    await handler(req, res);

    // Should parse date correctly
    expect(mockExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          date: new Date('2023-06-15')
        })
      })
    );
  });

  it('handles empty tags field correctly', async () => {
    const mockDoc = {
      _id: '12345',
      title: 'Test',
      content: 'Test content',
      embedding: [0],
      metadata: { tags: [] },
      save: mockSave
    };
    mockExperience.mockReturnValue(mockDoc);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        title: 'Test',
        content: 'Test content',
        tags: '' // Empty tags
      },
    });

    await handler(req, res);

    // Should handle empty tags correctly
    expect(mockExperience).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          tags: []
        })
      })
    );
  });
}); 