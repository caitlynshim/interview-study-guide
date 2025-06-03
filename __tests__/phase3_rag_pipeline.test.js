import { createMocks } from 'node-mocks-http';

// Mock the generate API handler module completely
const mockGenerateEmbedding = jest.fn();
const mockGenerateAnswer = jest.fn();

// Mock the entire OpenAI lib before importing anything
jest.mock('../lib/openai', () => ({
  generateEmbedding: mockGenerateEmbedding,
  generateAnswer: mockGenerateAnswer,
}));

// Mock the database connection
jest.mock('../lib/mongodb', () => jest.fn().mockResolvedValue({}));

// Mock the Experience model
const mockAggregate = jest.fn();
const mockFind = jest.fn();
jest.mock('../models/Experience', () => ({
  aggregate: mockAggregate,
  find: mockFind,
}));

// Now import the handler after all mocks are set up
const handler = require('../pages/api/experiences/generate').default;

describe('Phase 3 – RAG Pipeline (API)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 if question missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Missing question in body',
    });
  });

  it('returns answer that includes at least one snippet & reference link', async () => {
    // Mock OpenAI functions
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockGenerateAnswer.mockResolvedValue('This is a detailed answer about leadership challenges [1].');

    // Mock MongoDB Experience aggregation
    const mockExperiences = [
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Leadership Challenge at StartupCorp',
        content: 'Led a team of 8 engineers through a critical migration project that reduced system downtime by 90%.',
      },
      {
        _id: '507f1f77bcf86cd799439012',
        title: 'Technical Architecture Decision',
        content: 'Designed microservices architecture that improved scalability by 300%.',
      },
    ];

    mockAggregate.mockResolvedValue(mockExperiences);

    const { req, res } = createMocks({
      method: 'POST',
      body: { question: 'Tell me about a leadership challenge you faced' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    
    // Check that answer contains content
    expect(responseData.answer).toBeDefined();
    expect(responseData.answer).toContain('This is a detailed answer about leadership challenges [1].');
    
    // Check that answer includes references section with links
    expect(responseData.answer).toContain('**References:**');
    expect(responseData.answer).toContain('[1]** [Leadership Challenge at StartupCorp](/navigate-experiences#507f1f77bcf86cd799439011)');
    expect(responseData.answer).toContain('[2]** [Technical Architecture Decision](/navigate-experiences#507f1f77bcf86cd799439012)');
    
    // Check that context is returned
    expect(responseData.context).toEqual(mockExperiences);
  });

  it('vector search index param is passed in aggregation', async () => {
    // Mock OpenAI functions
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockGenerateAnswer.mockResolvedValue('Sample answer');

    // Mock successful aggregation
    mockAggregate.mockResolvedValue([
      { _id: '1', title: 'Test', content: 'Test content' },
    ]);

    const { req, res } = createMocks({
      method: 'POST',
      body: { question: 'Test question' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    // Verify the aggregation pipeline was called with correct vector search params
    expect(mockAggregate).toHaveBeenCalledWith([
      {
        $vectorSearch: {
          index: 'vector_search',
          queryVector: [0.1, 0.2, 0.3],
          path: 'embedding',
          numCandidates: 100,
          limit: 3,
        },
      },
      { $project: { content: 1, title: 1, _id: 1 } },
    ]);
  });

  it('handles vector search failure with fallback to $search', async () => {
    // Mock OpenAI functions
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockGenerateAnswer.mockResolvedValue('Fallback answer');

    // Mock first aggregation to fail, second to succeed
    mockAggregate
      .mockRejectedValueOnce(new Error('Vector search failed'))
      .mockResolvedValueOnce([
        { _id: '1', title: 'Fallback Test', content: 'Fallback content' },
      ]);

    const { req, res } = createMocks({
      method: 'POST',
      body: { question: 'Test question' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData.answer).toContain('Fallback answer');
    
    // Verify both aggregation calls were made
    expect(mockAggregate).toHaveBeenCalledTimes(2);
    
    // Check fallback pipeline was used
    expect(mockAggregate).toHaveBeenLastCalledWith([
      {
        $search: {
          index: 'vector_search',
          knnBeta: {
            vector: [0.1, 0.2, 0.3],
            path: 'embedding',
            k: 3,
          },
        },
      },
      { $project: { content: 1, title: 1, _id: 1 } },
    ]);
  });

  it('handles both vector search and fallback failure with random docs', async () => {
    // Mock OpenAI functions
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockGenerateAnswer.mockResolvedValue('Random docs answer');

    // Mock both aggregations to fail
    mockAggregate
      .mockRejectedValueOnce(new Error('Vector search failed'))
      .mockRejectedValueOnce(new Error('Fallback search failed'));
    
    // Mock the final fallback find
    const mockRandomDocs = [{ content: 'Random content 1' }, { content: 'Random content 2' }];
    mockFind.mockReturnValue({
      limit: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockRandomDocs),
      }),
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: { question: 'Test question' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    
    const responseData = JSON.parse(res._getData());
    expect(responseData.answer).toContain('Random docs answer');
    
    // Verify Experience.find was called as final fallback
    expect(mockFind).toHaveBeenCalledWith({});
  });

  it('handles OpenAI API failure gracefully', async () => {
    // Mock embedding to succeed but answer generation to fail
    mockGenerateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockGenerateAnswer.mockRejectedValue(new Error('OpenAI API error'));

    mockAggregate.mockResolvedValue([
      { _id: '1', title: 'Test', content: 'Test content' },
    ]);

    const { req, res } = createMocks({
      method: 'POST',
      body: { question: 'Test question' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Internal server error',
    });
  });

  it('returns 405 for non-POST methods', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Method not allowed',
    });
  });
}); 