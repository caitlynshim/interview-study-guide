const mongoose = require('mongoose');
const { connect } = require('../lib/mongodb');
const Experience = require('../models/Experience');

describe('Experiences Collection Tests', () => {
  let db;

  beforeAll(async () => {
    await connect();
    db = mongoose.connection;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Experience.deleteMany({});
  });

  describe('Basic Collection Operations', () => {
    it('should create and retrieve an experience', async () => {
      const testExperience = {
        title: 'Test Experience',
        description: 'Test Description',
        content: 'Test Content',
        type: 'technical',
        tags: ['test', 'experience'],
        embedding: new Array(1536).fill(0.1)
      };

      const experience = await Experience.create(testExperience);
      expect(experience.title).toBe(testExperience.title);
      expect(experience.type).toBe(testExperience.type);
      expect(experience.content).toBe(testExperience.content);
    });

    it('should enforce required fields', async () => {
      const invalidExperience = {
        title: 'Invalid Experience'
      };

      await expect(Experience.create(invalidExperience)).rejects.toThrow('validation failed');
    });
  });

  describe('Vector Search Operations', () => {
    beforeEach(async () => {
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
        }
      ];

      await Experience.create(testExperiences);
    });

    it('should have vector search index', async () => {
      const indexes = await db.collection('experiences').listSearchIndexes().toArray();
      const vectorIndex = indexes.find(idx => idx.name === 'vector_search');
      expect(vectorIndex).toBeTruthy();
      expect(vectorIndex.definition.mappings.fields).toHaveProperty('embedding');
    });

    it('should perform vector similarity search', async () => {
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
      ]).exec();

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Database Optimization');
    });
  });
}); 