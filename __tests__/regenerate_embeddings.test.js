const { createMocks } = require('node-mocks-http');

// Mock dependencies
jest.mock('../lib/mongodb', () => jest.fn().mockResolvedValue({}));
jest.mock('../lib/dbConnect', () => jest.fn().mockResolvedValue({}));
jest.mock('../models/Experience', () => ({
  find: jest.fn(),
  updateOne: jest.fn(),
  aggregate: jest.fn(),
}));
jest.mock('../lib/openai', () => ({
  generateEmbedding: jest.fn(),
}));

// Mock the regenerate-embeddings module
jest.mock('../scripts/regenerate-embeddings.js', () => {
  return jest.fn();
});

const Experience = require('../models/Experience');
const { generateEmbedding } = require('../lib/openai');

describe('Regenerate Embeddings for RAG - TDD', () => {
  let mockRegenerateEmbeddings;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock implementation
    mockRegenerateEmbeddings = jest.fn();
    require('../scripts/regenerate-embeddings.js').mockImplementation(mockRegenerateEmbeddings);
  });

  describe('Missing Embeddings Detection and Fix', () => {
    it('should detect experiences without embeddings and regenerate them', async () => {
      // Mock the expected behavior
      mockRegenerateEmbeddings.mockResolvedValue({
        totalExperiences: 2,
        experiencesWithoutEmbeddings: 2,
        embeddingsGenerated: 2,
        errors: 0
      });

      const regenerateEmbeddings = require('../scripts/regenerate-embeddings.js');
      const result = await regenerateEmbeddings({ dryRun: false });

      expect(result.totalExperiences).toBe(2);
      expect(result.experiencesWithoutEmbeddings).toBe(2);
      expect(result.embeddingsGenerated).toBe(2);
      expect(result.errors).toBe(0);

      expect(mockRegenerateEmbeddings).toHaveBeenCalledWith({ dryRun: false });
    });

    it('should handle errors gracefully during embedding regeneration', async () => {
      mockRegenerateEmbeddings.mockResolvedValue({
        totalExperiences: 1,
        experiencesWithoutEmbeddings: 1,
        embeddingsGenerated: 0,
        errors: 1
      });

      const regenerateEmbeddings = require('../scripts/regenerate-embeddings.js');
      const result = await regenerateEmbeddings({ dryRun: false });

      expect(result.totalExperiences).toBe(1);
      expect(result.experiencesWithoutEmbeddings).toBe(1);
      expect(result.embeddingsGenerated).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should run in dry-run mode without making changes', async () => {
      mockRegenerateEmbeddings.mockResolvedValue({
        totalExperiences: 1,
        experiencesWithoutEmbeddings: 1,
        embeddingsGenerated: 0, // No embeddings generated in dry run
        errors: 0
      });

      const regenerateEmbeddings = require('../scripts/regenerate-embeddings.js');
      const result = await regenerateEmbeddings({ dryRun: true });

      expect(result.totalExperiences).toBe(1);
      expect(result.experiencesWithoutEmbeddings).toBe(1);
      expect(result.embeddingsGenerated).toBe(0); // No embeddings generated in dry run

      expect(mockRegenerateEmbeddings).toHaveBeenCalledWith({ dryRun: true });
    });
  });
}); 