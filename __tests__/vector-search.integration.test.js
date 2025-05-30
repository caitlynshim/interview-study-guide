const mongoose = require('mongoose');
const { connect } = require('../lib/mongodb');
const Experience = require('../models/Experience');
const { generateEmbedding } = require('../lib/openai');

describe('Vector Search Integration Tests', () => {
  describe('Vector Similarity Search', () => {
    beforeAll(async () => {
      await connect();
    });

    afterAll(async () => {
      await mongoose.disconnect();
    });

    beforeEach(async () => {
      // Clear the collection
      await Experience.deleteMany({});

      // Insert test data
      const testExperiences = [
        {
          title: 'Database Optimization',
          description: 'I optimized database queries for better performance',
          content: 'I improved database performance by adding indexes and optimizing queries.',
          type: 'technical',
          tags: ['database', 'optimization'],
          embedding: new Array(1536).fill(0.1)
        },
        {
          title: 'Team Leadership',
          description: 'Led a team of developers',
          content: 'I led a team of 5 developers on a major project.',
          type: 'leadership',
          tags: ['leadership', 'management'],
          embedding: new Array(1536).fill(0.2)
        },
        {
          title: 'Security Implementation',
          description: 'Implemented security measures',
          content: 'I implemented OAuth2 and rate limiting for our APIs.',
          type: 'technical',
          tags: ['security', 'api'],
          embedding: new Array(1536).fill(0.3)
        }
      ];

      await Experience.create(testExperiences);
    });

    it('should return relevant experiences based on semantic similarity', async () => {
      const searchVector = new Array(1536).fill(0.1);
      const results = await Experience.aggregate([
        {
          $search: {
            knnBeta: {
              vector: searchVector,
              path: 'embedding',
              k: 2
            }
          }
        }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Database Optimization');
    });

    it('should combine vector search with tag filtering', async () => {
      const searchVector = new Array(1536).fill(0.2);
      const results = await Experience.aggregate([
        {
          $search: {
            knnBeta: {
              vector: searchVector,
              path: 'embedding',
              k: 10
            }
          }
        },
        {
          $match: {
            tags: 'leadership'
          }
        }
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Team Leadership');
    });

    it('should handle empty search results gracefully', async () => {
      const searchVector = new Array(1536).fill(0.9);
      const results = await Experience.aggregate([
        {
          $search: {
            knnBeta: {
              vector: searchVector,
              path: 'embedding',
              k: 1
            }
          }
        },
        {
          $match: {
            tags: 'nonexistent'
          }
        }
      ]);

      expect(results).toHaveLength(0);
    });

    it('should return experiences ordered by semantic similarity', async () => {
      const searchVector = new Array(1536).fill(0.15);
      const results = await Experience.aggregate([
        {
          $search: {
            knnBeta: {
              vector: searchVector,
              path: 'embedding',
              k: 3
            }
          }
        }
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Database Optimization');
    });
  });
}); 