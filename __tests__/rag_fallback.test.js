const { createMocks } = require('node-mocks-http');

// Mock dependencies
jest.mock('../lib/mongodb', () => jest.fn().mockResolvedValue({}));
jest.mock('../lib/dbConnect', () => jest.fn().mockResolvedValue({}));
jest.mock('../models/Experience', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../lib/openai', () => ({
  generateEmbedding: jest.fn(),
  generateAnswer: jest.fn(),
}));

const Experience = require('../models/Experience');
const { generateEmbedding, generateAnswer } = require('../lib/openai');

// Import the handler after mocks are set up
const handler = require('../pages/api/experiences/generate').default;

describe('RAG Fallback Mechanism - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Vector Search Fallback', () => {
    it('should fall back to text search when vector search fails', async () => {
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      // Mock vector search failure (returns empty)
      Experience.aggregate
        .mockResolvedValueOnce([]) // First call (vector search) fails
        .mockResolvedValueOnce([   // Second call (text search fallback) succeeds
          {
            _id: '6840090d806962888f431f3a',
            title: 'AWS Config Infrastructure',
            content: 'AWS Config with accumulated technical debt...',
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5]
          }
        ]);
      
      generateAnswer.mockResolvedValue('Based on my AWS Config experience [1], I worked with...');

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about AWS Config' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      
      console.log('DEBUG - Fallback test:');
      console.log('  - Candidates found:', responseData.debug.candidatesFound);
      console.log('  - Relevant results:', responseData.debug.relevantResults);
      console.log('  - Used fallback:', responseData.debug.usedFallback);
      
      // Should find results via fallback
      expect(responseData.debug.candidatesFound).toBe(1);
      expect(responseData.debug.usedFallback).toBe(true);
      expect(responseData.context.length).toBeGreaterThan(0);
      expect(responseData.answer).toContain('Based on my');
      
      // Verify both vector search and fallback were attempted
      expect(Experience.aggregate).toHaveBeenCalledTimes(2);
    });

    it('should provide helpful message when both vector and text search fail', async () => {
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      // Mock both vector search and fallback failing
      Experience.aggregate
        .mockResolvedValueOnce([]) // Vector search fails
        .mockResolvedValueOnce([]); // Text search fallback also fails
      
      generateAnswer.mockResolvedValue(
        'I don\'t have any relevant experiences in my collection that directly address this question.'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about quantum computing' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      
      expect(responseData.debug.candidatesFound).toBe(0);
      expect(responseData.debug.usedFallback).toBe(true);
      expect(responseData.context.length).toBe(0);
      expect(responseData.answer).toContain('don\'t have any relevant experiences');
    });
  });
}); 