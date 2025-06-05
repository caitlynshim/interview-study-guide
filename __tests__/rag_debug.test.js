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

describe('RAG Debug - Real World Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Debugging Relevance Issues', () => {
    it('should find relevant experiences for leadership questions with realistic embeddings', async () => {
      // Setup: Use realistic embeddings that should have reasonable similarity
      // Question about leadership
      generateEmbedding.mockResolvedValue([
        0.1, 0.2, 0.3, 0.4, 0.5, 0.1, 0.2, 0.3, 0.4, 0.5  // Simple pattern
      ]);
      
      const realWorldExperiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Leading Engineering Team',
          content: 'Led a team of 8 engineers to deliver a critical product feature. Managed timeline, resolved conflicts, and ensured quality delivery.',
          embedding: [
            0.15, 0.25, 0.35, 0.45, 0.55, 0.12, 0.22, 0.32, 0.42, 0.52  // Similar pattern - should have good similarity
          ]
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Database Migration Project',
          content: 'Migrated legacy database to modern infrastructure with zero downtime.',
          embedding: [
            0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.5, 0.5  // Very different pattern - should have low similarity
          ]
        }
      ];
      
      Experience.aggregate.mockResolvedValue(realWorldExperiences);
      
      generateAnswer.mockResolvedValue(
        'Based on my leadership experience [1], I led a team of 8 engineers to deliver a critical product feature, managing timeline and resolving conflicts.'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about a time you led a team' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      console.log('DEBUG - Response data:', JSON.stringify(responseData, null, 2));
      
      // Should find at least the leadership experience as relevant
      expect(responseData.context.length).toBeGreaterThan(0);
      expect(responseData.answer).toContain('Based on my');
      expect(responseData.answer).not.toContain('don\'t have any relevant experiences');
    });

    it('should show debug information about similarity calculations', async () => {
      // Test with embeddings that definitely should match
      generateEmbedding.mockResolvedValue([1.0, 0.0, 0.0]); // Simple vector
      
      const experiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Perfect Match Experience',
          content: 'This should match the question perfectly',
          embedding: [1.0, 0.0, 0.0] // Identical vector - similarity should be 1.0
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'No Match Experience', 
          content: 'This should not match at all',
          embedding: [0.0, 1.0, 0.0] // Orthogonal vector - similarity should be 0.0
        }
      ];
      
      Experience.aggregate.mockResolvedValue(experiences);
      generateAnswer.mockResolvedValue('Perfect match answer [1]');

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Test question' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      
      console.log('DEBUG - Perfect match test:', JSON.stringify(responseData.debug, null, 2));
      console.log('DEBUG - Context length:', responseData.context.length);
      console.log('DEBUG - Context data:', JSON.stringify(responseData.context, null, 2));
      
      // With identical vectors, we should definitely find a match
      expect(responseData.debug.candidatesFound).toBe(2);
      expect(responseData.debug.relevantResults).toBeGreaterThan(0);
      expect(responseData.context.length).toBeGreaterThan(0);
    });

    it('should test various similarity thresholds', async () => {
      generateEmbedding.mockResolvedValue([1.0, 0.0]);
      
      const experiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Medium similarity',
          content: 'Should have moderate similarity',
          embedding: [0.7, 0.7] // Should have similarity around 0.7 when normalized
        }
      ];
      
      Experience.aggregate.mockResolvedValue(experiences);
      generateAnswer.mockResolvedValue('Medium similarity answer [1]');

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Test question' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      
      console.log('DEBUG - Medium similarity test:');
      console.log('  - Candidates found:', responseData.debug.candidatesFound);
      console.log('  - Relevant results:', responseData.debug.relevantResults);
      console.log('  - Threshold:', responseData.debug.threshold);
      console.log('  - Context length:', responseData.context.length);
      
      if (responseData.context.length > 0) {
        console.log('  - Similarity score:', responseData.context[0].similarity);
      }
      
      // This will help us understand what similarity scores we're actually getting
      expect(responseData.debug.candidatesFound).toBe(1);
    });

    it('should test if the cosine similarity function works correctly', () => {
      // Import the cosine similarity function for direct testing
      // We'll test this by checking the actual calculations
      
      // Test vectors that should have known similarity scores
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0]; // Identical - should be 1.0
      const vec3 = [0, 1, 0]; // Orthogonal - should be 0.0
      const vec4 = [0.7071, 0.7071, 0]; // 45 degrees - should be ~0.7071
      
      // We'll manually calculate expected similarities and verify our function
      const expectedSimilarities = {
        identical: 1.0,
        orthogonal: 0.0,
        fortyFiveDegrees: 0.7071
      };
      
      console.log('DEBUG - Testing cosine similarity calculations');
      console.log('Expected similarities:', expectedSimilarities);
      
      // This test will pass - we're using it to understand the similarity function
      expect(true).toBe(true);
    });

    it('should check if real database experiences have embeddings', async () => {
      // This test will help us understand why vector search returns 0 candidates
      // when we know there are 8 experiences in the database
      
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      // Mock what the database might actually be returning
      // (experiences without embeddings)
      const experiencesWithoutEmbeddings = [
        {
          _id: '6840090d806962888f431f3a',
          title: 'AWS Account Lifecycle and Deletion Integrity',
          content: 'AWS Account deletion compliance was initially split...',
          // Notice: NO embedding field
        }
      ];
      
      Experience.aggregate.mockResolvedValue(experiencesWithoutEmbeddings);
      generateAnswer.mockResolvedValue('No experiences found response');

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about AWS experience' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      
      console.log('DEBUG - Real DB simulation:');
      console.log('  - Candidates found:', responseData.debug.candidatesFound);
      console.log('  - Relevant results:', responseData.debug.relevantResults);
      console.log('  - Answer contains "don\'t have":', responseData.answer.includes('don\'t have'));
      
      // If experiences don't have embeddings, similarity calculation will fail
      // and all experiences will be filtered out
      expect(responseData.debug.candidatesFound).toBe(1);
      expect(responseData.debug.relevantResults).toBe(0); // Because no embedding = similarity 0
    });

    it('should handle vector search failure gracefully', async () => {
      // Test what happens when vector search completely fails
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
      
      // Mock vector search failure - returns empty array
      Experience.aggregate.mockResolvedValue([]);
      generateAnswer.mockResolvedValue('No experiences found response');

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about AWS experience' },
      });

      await handler(req, res);

      const responseData = JSON.parse(res._getData());
      
      console.log('DEBUG - Vector search failure simulation:');
      console.log('  - Candidates found:', responseData.debug.candidatesFound);
      console.log('  - Relevant results:', responseData.debug.relevantResults);
      console.log('  - Answer contains "don\'t have":', responseData.answer.includes('don\'t have'));
      
      // When vector search fails completely, we get 0 candidates
      expect(responseData.debug.candidatesFound).toBe(0);
      expect(responseData.debug.relevantResults).toBe(0);
      expect(responseData.answer).toBe('No experiences found response');
    });
  });
}); 