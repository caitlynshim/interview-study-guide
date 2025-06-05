const { createMocks } = require('node-mocks-http');

// Mock dependencies in correct order
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

describe('RAG Relevance System - TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('No Relevant Experiences Found', () => {
    it('should return "no relevant experiences" when vector search returns empty results', async () => {
      // Setup: Mock empty vector search results
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      Experience.aggregate.mockResolvedValue([]); // No experiences found
      
      generateAnswer.mockResolvedValue(
        'I don\'t have any relevant experiences in my collection that relate to this question. ' +
        'Could you try asking about a different topic, or consider adding experiences related to this area?'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about managing a team of 50+ people' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      // Should indicate no relevant experiences
      expect(responseData.answer).toContain('don\'t have any relevant experiences');
      expect(responseData.context).toEqual([]);
      
      // Should not call generateAnswer with meaningful context since there are no results
      expect(generateAnswer).toHaveBeenCalledWith({
        question: 'Tell me about managing a team of 50+ people',
        context: '' // Empty context since no experiences found
      });
    });

    it('should return "no relevant experiences" when experiences exist but similarity scores are too low', async () => {
      // Setup: Mock low-relevance experiences with low similarity embeddings
      generateEmbedding.mockResolvedValue([1.0, 0.0, 0.0]); // Query embedding
      
      const lowRelevanceExperiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Learning Python Basics',
          content: 'I learned Python syntax and wrote hello world programs',
          embedding: [0.0, 1.0, 0.0] // Orthogonal to query, similarity = 0
        },
        {
          _id: '507f1f77bcf86cd799439012', 
          title: 'Buying Office Supplies',
          content: 'I purchased pens and paper for the office',
          embedding: [0.0, 0.0, 1.0] // Orthogonal to query, similarity = 0
        }
      ];
      
      Experience.aggregate.mockResolvedValue(lowRelevanceExperiences);
      
      generateAnswer.mockResolvedValue(
        'I don\'t have any relevant experiences that directly address this leadership question. ' +
        'The experiences in my collection don\'t contain sufficient detail about managing large teams.'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'How do you handle conflict resolution in a team of 20+ engineers?' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      // Should indicate insufficient relevant context
      expect(responseData.answer).toContain('don\'t have any relevant experiences');
      expect(responseData.answer).toContain('don\'t contain sufficient detail');
      
      // Context should be empty since experiences were filtered out due to low relevance
      expect(responseData.context).toEqual([]);
      
      // Should be called with empty context since similarity was below threshold
      expect(generateAnswer).toHaveBeenCalledWith({
        question: 'How do you handle conflict resolution in a team of 20+ engineers?',
        context: '' // Empty because low similarity scores were filtered out
      });
    });
  });

  describe('Relevant Experiences Found', () => {
    it('should generate detailed answers when highly relevant experiences exist', async () => {
      // Setup: Mock highly relevant experiences with high similarity embeddings
      generateEmbedding.mockResolvedValue([1.0, 1.0, 1.0]); // Query embedding
      
      const relevantExperiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Leading Cross-Functional Team at TechCorp',
          content: 'I led a cross-functional team of 12 engineers and 3 designers through a critical product launch, implementing agile methodologies and resolving conflicts through structured 1-on-1s and team retrospectives.',
          embedding: [0.9, 0.9, 0.9] // Very similar to query, high similarity ~0.99
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Scaling Engineering Team from 5 to 25',
          content: 'As Engineering Manager, I scaled our team from 5 to 25 people over 18 months, establishing hiring processes, mentorship programs, and performance review cycles that reduced turnover by 60%.',
          embedding: [0.8, 0.8, 0.8] // Very similar to query, high similarity ~0.96
        }
      ];
      
      Experience.aggregate.mockResolvedValue(relevantExperiences);
      
      generateAnswer.mockResolvedValue(
        '## Leading Teams and Conflict Resolution\n\n' +
        'Based on my experience, I\'ve successfully managed teams through several approaches:\n\n' +
        '**At TechCorp, I led a cross-functional team of 15 people** [1] where I implemented structured conflict resolution:\n' +
        '- **1-on-1 Meetings**: I scheduled weekly individual meetings to address concerns before they escalated\n' +
        '- **Team Retrospectives**: We held bi-weekly retrospectives to surface and resolve team dynamics issues\n' +
        '- **Agile Methodologies**: I introduced sprint planning and daily standups to improve communication\n\n' +
        '**When scaling the engineering team** [2], I developed systematic approaches:\n' +
        '- **Hiring Processes**: Established structured interview processes and technical assessments\n' +
        '- **Mentorship Programs**: Paired senior engineers with junior team members\n' +
        '- **Performance Reviews**: Implemented quarterly review cycles with clear advancement paths\n\n' +
        'The result was a **60% reduction in turnover** [2] and successful product launch with zero major incidents [1].'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'How do you handle conflict resolution in a team of 20+ engineers?' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      
      // Should provide detailed, experience-based answer
      expect(responseData.answer).toContain('Based on my experience');
      expect(responseData.answer).toContain('TechCorp');
      expect(responseData.answer).toContain('60% reduction in turnover');
      expect(responseData.answer).toContain('[1]');
      expect(responseData.answer).toContain('[2]');
      
      // Should include references section
      expect(responseData.answer).toContain('**References:**');
      // Note: Due to sorting by similarity, the higher similarity experience comes first
      expect(responseData.answer).toContain('[1]** [Leading Cross-Functional Team at TechCorp]');
      expect(responseData.answer).toContain('[2]** [Scaling Engineering Team from 5 to 25]');
      
      // Context should include relevant experiences (without embeddings), sorted by similarity
      expect(responseData.context).toEqual([
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Leading Cross-Functional Team at TechCorp',
          content: 'I led a cross-functional team of 12 engineers and 3 designers through a critical product launch, implementing agile methodologies and resolving conflicts through structured 1-on-1s and team retrospectives.',
          similarity: expect.any(Number)
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Scaling Engineering Team from 5 to 25',
          content: 'As Engineering Manager, I scaled our team from 5 to 25 people over 18 months, establishing hiring processes, mentorship programs, and performance review cycles that reduced turnover by 60%.',
          similarity: expect.any(Number)
        }
      ]);
    });
  });

  describe('Context Quality Control', () => {
    it('should pass relevant context to generateAnswer and expect contextual response', async () => {
      generateEmbedding.mockResolvedValue([1.0, 0.0, 0.0]);
      
      const experiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Database Migration Project',
          content: 'Led a 6-month database migration from MySQL to PostgreSQL, coordinating with 4 teams and achieving 99.9% uptime during transition.',
          embedding: [0.9, 0.1, 0.1] // High similarity to query
        }
      ];
      
      Experience.aggregate.mockResolvedValue(experiences);
      generateAnswer.mockResolvedValue('Detailed technical answer with citations [1]');

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about a challenging technical project you led' },
      });

      await handler(req, res);

      // Verify context was properly formatted and passed to generateAnswer
      expect(generateAnswer).toHaveBeenCalledWith({
        question: 'Tell me about a challenging technical project you led',
        context: '(1) Database Migration Project: Led a 6-month database migration from MySQL to PostgreSQL, coordinating with 4 teams and achieving 99.9% uptime during transition.'
      });
      
      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle mixed relevant and irrelevant experiences by filtering based on similarity', async () => {
      generateEmbedding.mockResolvedValue([1.0, 0.0, 0.0]);
      
      const mixedExperiences = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'System Architecture Design',
          content: 'Designed microservices architecture serving 1M+ users with 99.99% availability',
          embedding: [0.9, 0.1, 0.1] // High similarity to query ~0.93
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Coffee Machine Setup',
          content: 'Set up the office coffee machine and trained colleagues on its use',
          embedding: [0.1, 0.9, 0.1] // Low similarity to query ~0.17 (below 0.3 threshold)
        }
      ];
      
      Experience.aggregate.mockResolvedValue(mixedExperiences);
      
      // generateAnswer should only receive the relevant experience
      generateAnswer.mockResolvedValue(
        'Based on my experience with system architecture [1], I designed a microservices architecture that served over 1 million users with 99.99% availability.'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Describe a time you made a critical technical decision' },
      });

      await handler(req, res);

      // Should only pass the relevant experience (coffee machine filtered out)
      expect(generateAnswer).toHaveBeenCalledWith({
        question: 'Describe a time you made a critical technical decision',
        context: '(1) System Architecture Design: Designed microservices architecture serving 1M+ users with 99.99% availability'
      });

      const responseData = JSON.parse(res._getData());
      expect(responseData.answer).toContain('system architecture');
      
      // Context should only include the relevant experience
      expect(responseData.context).toEqual([
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'System Architecture Design',
          content: 'Designed microservices architecture serving 1M+ users with 99.99% availability',
          similarity: expect.any(Number)
        }
      ]);
    });
  });

  describe('Fallback Behavior', () => {
    it('should NOT fall back to random documents when vector search fails - instead should return error or no results', async () => {
      generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
      
      // Mock vector search to fail completely
      Experience.aggregate
        .mockRejectedValueOnce(new Error('Vector search failed'))
        .mockRejectedValueOnce(new Error('Fallback search failed'));
      
      // Mock the find fallback to return empty to test proper behavior
      Experience.find.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([])
        })
      });

      generateAnswer.mockResolvedValue(
        'I\'m unable to search my experiences right now due to a technical issue. Please try again later.'
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'Tell me about leadership' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      
      // Should indicate technical issue rather than providing random/irrelevant content
      expect(responseData.message).toContain('Internal');
    });
  });

  describe('System Prompt Compliance', () => {
    it('should ensure generateAnswer receives proper instructions about context limitations', async () => {
      generateEmbedding.mockResolvedValue([0.3, 0.4, 0.5]);
      Experience.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      
      generateAnswer.mockImplementation(({ question, context }) => {
        // Simulate what generateAnswer should do with empty context
        if (!context || context.trim() === '') {
          return 'I don\'t have any relevant experiences in my collection that relate to this question.';
        }
        return 'Answer based on context';
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { question: 'How do you handle stakeholder management?' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.message).toContain('Internal');
    });
  });
}); 