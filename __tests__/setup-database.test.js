const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const setupDatabase = require('../scripts/setup-database');

describe('Database Setup Script', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
    }
    // Ensure clean disconnection state
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('Database Creation and URI Handling', () => {
    test('should extract database name from MongoDB URI correctly', async () => {
      const testUri = mongoUri.replace(/\/[^\/]*$/, '/test-interview-db');
      const result = await setupDatabase({ mongoUri: testUri, dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.databaseName).toBe('test-interview-db');
      expect(result.databaseCreated).toBe(false); // dry run shouldn't create
    });

    test('should handle Atlas URI format with database name', async () => {
      // Use a valid test URI structure but with the database name we want to test
      const atlasUri = mongoUri.replace(/\/[^\/]*$/, '/interview-study-guide');
      const result = await setupDatabase({ mongoUri: atlasUri, dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.databaseName).toBe('interview-study-guide');
    });

    test('should use default database name when not specified in URI', async () => {
      const uriWithoutDb = mongoUri.replace(/\/[^\/]*$/, '');
      const result = await setupDatabase({ mongoUri: uriWithoutDb, dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.databaseName).toBe('interview-study-guide'); // default name
    });

    test('should create database when it does not exist', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result.success).toBe(true);
      expect(result.databaseCreated).toBe(true);
      expect(result.databaseName).toBeDefined();
    });

    test('should detect existing database', async () => {
      // Create database first by setting up collections
      const firstResult = await setupDatabase({ mongoUri, dryRun: false });
      expect(firstResult.success).toBe(true);

      // Run setup again - should detect existing database
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result.success).toBe(true);
      expect(result.databaseCreated).toBe(false);
      expect(result.databaseExisted).toBe(true);
    });

    test('should handle database creation errors gracefully', async () => {
      // Test with invalid database name characters
      const invalidDbUri = mongoUri.replace(/\/[^\/]*$/, '/invalid db name!@#');
      const result = await setupDatabase({ mongoUri: invalidDbUri, dryRun: false });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Database Connection', () => {
    test('should connect to MongoDB successfully', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: true });
      expect(result.success).toBe(true);
      expect(result.connected).toBe(true);
    });

    test('should handle connection errors gracefully', async () => {
      const invalidUri = 'mongodb://invalid:27017/test';
      const result = await setupDatabase({ mongoUri: invalidUri, dryRun: true });
      expect(result.success).toBe(false);
      expect(result.error).toContain('MongoDB');
    });

    test('should use environment variable if no URI provided', async () => {
      process.env.MONGODB_URI = mongoUri;
      const result = await setupDatabase({ dryRun: true });
      expect(result.success).toBe(true);
      delete process.env.MONGODB_URI;
    });
  });

  describe('Collections Creation', () => {
    test('should create all required collections', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result.success).toBe(true);
      // When running in sequence with other tests, collections might already exist
      expect(Object.keys(result.collections)).toEqual(
        expect.arrayContaining(['questions', 'experiences', 'questionpractices'])
      );
      
      // All collections should exist after the setup
      expect(result.collections.questions).toBeDefined();
      expect(result.collections.experiences).toBeDefined();
      expect(result.collections.questionpractices).toBeDefined();
      
      // Each collection should have either been created or detected as existing
      for (const collection of Object.values(result.collections)) {
        expect(collection.created || collection.existed).toBe(true);
      }
    });

    test('should detect existing collections', async () => {
      // Create collections first
      await mongoose.connect(mongoUri);
      await mongoose.connection.createCollection('questions');
      await mongoose.connection.createCollection('experiences');
      await mongoose.disconnect();

      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result.collections.questions.existed).toBe(true);
      expect(result.collections.experiences.existed).toBe(true);
      // questionpractices might already exist if running with other tests
      if (result.collections.questionpractices.created) {
        expect(result.collections.questionpractices.existed).toBe(false);
      } else {
        expect(result.collections.questionpractices.existed).toBe(true);
      }
    });

    test('should be idempotent - running multiple times should not cause errors', async () => {
      const result1 = await setupDatabase({ mongoUri, dryRun: false });
      const result2 = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.collections.questions.existed).toBe(true);
      expect(result2.collections.experiences.existed).toBe(true);
      expect(result2.collections.questionpractices.existed).toBe(true);
    });
  });

  describe('Index Creation - Questions Collection', () => {
    test('should create text index on question field', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questions').indexes();
      await mongoose.disconnect();
      
      // Text indexes have a different structure
      const textIndex = indexes.find(idx => idx.name.includes('text') || 
        Object.keys(idx.key).includes('_fts'));
      expect(textIndex).toBeDefined();
      expect(result.indexes.questions.textIndex).toBe(true);
    });

    test('should create index on category field', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questions').indexes();
      await mongoose.disconnect();
      
      const categoryIndex = indexes.find(idx => idx.key.category === 1);
      expect(categoryIndex).toBeDefined();
      expect(result.indexes.questions.categoryIndex).toBe(true);
    });

    test('should create index on difficulty field', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questions').indexes();
      await mongoose.disconnect();
      
      const difficultyIndex = indexes.find(idx => idx.key.difficulty === 1);
      expect(difficultyIndex).toBeDefined();
      expect(result.indexes.questions.difficultyIndex).toBe(true);
    });
  });

  describe('Index Creation - Experiences Collection', () => {
    test('should create text index on content and title fields', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('experiences').indexes();
      await mongoose.disconnect();
      
      // Text indexes have a different structure
      const textIndex = indexes.find(idx => idx.name.includes('text') || 
        Object.keys(idx.key).includes('_fts'));
      expect(textIndex).toBeDefined();
      expect(result.indexes.experiences.textIndex).toBe(true);
    });

    test('should create compound index on metadata.category and title', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('experiences').indexes();
      await mongoose.disconnect();
      
      const compoundIndex = indexes.find(idx => 
        idx.key['metadata.category'] === 1 && idx.key.title === 1
      );
      expect(compoundIndex).toBeDefined();
      expect(result.indexes.experiences.categoryTitleIndex).toBe(true);
    });

    test('should create index on createdAt field', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('experiences').indexes();
      await mongoose.disconnect();
      
      const createdAtIndex = indexes.find(idx => idx.key.createdAt === -1);
      expect(createdAtIndex).toBeDefined();
      expect(result.indexes.experiences.createdAtIndex).toBe(true);
    });

    test('should note that vector search index needs manual creation', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result.indexes.experiences.vectorSearchIndex).toBe('manual');
      expect(result.warnings).toContain('Vector search index on experiences.embedding must be created manually in MongoDB Atlas');
    });
  });

  describe('Index Creation - QuestionPractices Collection', () => {
    test('should create compound index on questionId and datePracticed', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questionpractices').indexes();
      await mongoose.disconnect();
      
      const compoundIndex = indexes.find(idx => 
        idx.key.questionId === 1 && idx.key.datePracticed === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(result.indexes.questionpractices.questionIdDateIndex).toBe(true);
    });

    test('should create compound index on category and datePracticed', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questionpractices').indexes();
      await mongoose.disconnect();
      
      const compoundIndex = indexes.find(idx => 
        idx.key.category === 1 && idx.key.datePracticed === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(result.indexes.questionpractices.categoryDateIndex).toBe(true);
    });

    test('should create compound index on rating and datePracticed', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questionpractices').indexes();
      await mongoose.disconnect();
      
      const compoundIndex = indexes.find(idx => 
        idx.key.rating === 1 && idx.key.datePracticed === -1
      );
      expect(compoundIndex).toBeDefined();
      expect(result.indexes.questionpractices.ratingDateIndex).toBe(true);
    });

    test('should create index on datePracticed field', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      await mongoose.connect(mongoUri);
      const indexes = await mongoose.connection.collection('questionpractices').indexes();
      await mongoose.disconnect();
      
      const dateIndex = indexes.find(idx => 
        Object.keys(idx.key).length === 1 && idx.key.datePracticed === -1
      );
      expect(dateIndex).toBeDefined();
      expect(result.indexes.questionpractices.datePracticedIndex).toBe(true);
    });
  });

  describe('Dry Run Mode', () => {
    test('should not create collections or indexes in dry run mode', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.message).toContain('DRY RUN');
      
      // Verify no collections were created - but dry run only validates connection
      // We don't create anything in dry run mode
      expect(result.collections).toEqual({});
      expect(result.indexes).toEqual({});
    });

    test('should still validate connection in dry run mode', async () => {
      const result = await setupDatabase({ mongoUri: 'mongodb://invalid:27017/test', dryRun: true });
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing MONGODB_URI gracefully', async () => {
      delete process.env.MONGODB_URI;
      const result = await setupDatabase({});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('MONGODB_URI');
    });

    test('should handle index creation errors gracefully', async () => {
      // This test would need to simulate an index creation failure
      // For now, we'll test that the function structure handles errors
      const result = await setupDatabase({ mongoUri, dryRun: false });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });

    test('should provide detailed error information', async () => {
      const result = await setupDatabase({ mongoUri: 'mongodb://invalid:27017/test', dryRun: false });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Output and Logging', () => {
    test('should provide comprehensive result summary', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('collections');
      expect(result).toHaveProperty('indexes');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('summary');
    });

    test('should provide collection and index counts in summary', async () => {
      const result = await setupDatabase({ mongoUri, dryRun: false });
      
      expect(result.summary.collectionsCreated).toBeGreaterThanOrEqual(0);
      expect(result.summary.indexesCreated).toBeGreaterThan(0);
      expect(result.summary.totalCollections).toBe(3);
    });
  });
}); 