const { MongoClient } = require('mongodb');
const { createMocks } = require('node-mocks-http');
const addExperienceHandler = require('../../pages/api/experiences/add').default;
const searchExperiencesHandler = require('../../pages/api/experiences/search').default;
require('dotenv').config({ path: '.env.local' });

describe('Experiences API Integration Tests', () => {
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
    await experiences.deleteMany({});
  });

  describe('Experience Addition and Search Flow', () => {
    const sampleExperiences = [
      {
        type: 'technical',
        content: 'Built a scalable microservices architecture using Node.js and Docker',
      },
      {
        type: 'behavioral',
        content: 'Resolved a conflict between team members during a critical project phase',
      }
    ];

    test('should add experiences and find them via vector search', async () => {
      // Add experiences through API
      for (const exp of sampleExperiences) {
        const { req, res } = createMocks({
          method: 'POST',
          body: exp,
        });

        await addExperienceHandler(req, res);
        expect(res._getStatusCode()).toBe(200);
        
        const data = JSON.parse(res._getData());
        expect(data.success).toBe(true);
        expect(data.experience.embedding).toBeTruthy();
      }

      // Verify experiences were added with embeddings
      const addedExperiences = await experiences.find({}).toArray();
      expect(addedExperiences.length).toBe(sampleExperiences.length);
      addedExperiences.forEach(exp => {
        expect(exp.embedding).toBeTruthy();
        expect(exp.embedding.length).toBe(1536); // text-embedding-3-small dimensions
      });

      // Test vector search through API
      const { req: searchReq, res: searchRes } = createMocks({
        method: 'POST',
        body: {
          query: 'microservices architecture design patterns',
        },
      });

      await searchExperiencesHandler(searchReq, searchRes);
      expect(searchRes._getStatusCode()).toBe(200);

      const searchResults = JSON.parse(searchRes._getData());
      expect(searchResults.experiences.length).toBeGreaterThan(0);
      // The most relevant result should be about microservices
      expect(searchResults.experiences[0].content).toContain('microservices');
    });

    test('should handle invalid experience data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          // Missing required type field
          content: 'Invalid experience'
        },
      });

      await addExperienceHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBeTruthy();
    });

    test('should handle vector search with no matches', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          query: 'something completely unrelated to any experience',
        },
      });

      await searchExperiencesHandler(req, res);
      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data.experiences).toHaveLength(0);
    });
  });
}); 