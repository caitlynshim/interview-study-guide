const { MongoClient } = require('mongodb');
const { generateEmbedding } = require('../lib/openai');
require('dotenv').config({ path: '.env.local' });

describe('Experiences Collection Tests', () => {
  let client;
  let db;
  let experiences;

  beforeAll(async () => {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('interview-prep');
    experiences = db.collection('experiences');
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    // Clear the collection before each test
    await experiences.deleteMany({});
  });

  describe('Basic Collection Operations', () => {
    test('should create and retrieve an experience', async () => {
      const testExperience = {
        type: 'technical',
        content: 'Implemented a real-time chat feature',
        createdAt: new Date()
      };

      const result = await experiences.insertOne(testExperience);
      expect(result.acknowledged).toBe(true);

      const found = await experiences.findOne({ _id: result.insertedId });
      expect(found.type).toBe(testExperience.type);
      expect(found.content).toBe(testExperience.content);
    });

    test('should enforce required fields', async () => {
      const invalidExperience = {
        content: 'Missing type field'
      };

      await expect(experiences.insertOne(invalidExperience))
        .rejects
        .toBeTruthy();
    });
  });

  describe('Vector Search Operations', () => {
    const sampleExperiences = [
      {
        type: 'technical',
        content: 'Implemented a distributed caching system using Redis',
        createdAt: new Date()
      },
      {
        type: 'behavioral',
        content: 'Led a team of five developers to deliver a critical project',
        createdAt: new Date()
      },
      {
        type: 'technical',
        content: 'Optimized database queries reducing response time by 50%',
        createdAt: new Date()
      }
    ];

    beforeEach(async () => {
      // Add sample experiences with embeddings
      const experiencesWithEmbeddings = await Promise.all(
        sampleExperiences.map(async (exp) => ({
          ...exp,
          embedding: await generateEmbedding(exp.content)
        }))
      );
      await experiences.insertMany(experiencesWithEmbeddings);
    });

    test('should have vector search index', async () => {
      const indexes = await experiences.listIndexes().toArray();
      const vectorIndex = indexes.find(idx => idx.name === 'vector_search');
      expect(vectorIndex).toBeTruthy();
      expect(vectorIndex.key).toHaveProperty('embedding');
    });

    test('should perform vector similarity search', async () => {
      const searchText = 'database performance optimization';
      const embedding = await generateEmbedding(searchText);

      const results = await experiences.aggregate([
        {
          $vectorSearch: {
            index: 'vector_search',
            path: 'embedding',
            queryVector: embedding,
            numCandidates: 10,
            limit: 3
          }
        }
      ]).toArray();

      expect(results.length).toBeGreaterThan(0);
      // The most relevant result should be about database optimization
      expect(results[0].content).toContain('database');
    });
  });
}); 