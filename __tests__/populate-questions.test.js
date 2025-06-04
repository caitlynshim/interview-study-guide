const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

// Import the function we'll create
const populateQuestions = require('../scripts/populate-questions');

describe('Populate Questions Script', () => {
  let mongoServer;
  let mongoUri;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoUri);
    
    // Clean up any existing data
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.dropCollection(collection.name);
    }
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('Data Loading and Validation', () => {
    test('should load questions from JSON file successfully', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: 'data/questions.json'
      });
      
      expect(result.success).toBe(true);
      expect(result.questionsLoaded).toBe(70);
      expect(result.categories).toHaveLength(9);
      expect(result.categories).toContain('Technical Trade-offs & Architecture');
      expect(result.categories).toContain('Leadership & People');
    });

    test('should handle missing data file gracefully', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: 'data/nonexistent.json'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    test('should validate question structure', async () => {
      // Create a test file with invalid structure
      const invalidData = {
        questions: [
          { question: 'Valid question', category: 'Test', difficulty: 'medium' },
          { question: '', category: 'Test', difficulty: 'medium' }, // Invalid: empty question
          { category: 'Test', difficulty: 'medium' }, // Invalid: missing question
          { question: 'Valid', difficulty: 'medium' }, // Invalid: missing category
        ]
      };
      
      const testFile = 'test-invalid.json';
      fs.writeFileSync(testFile, JSON.stringify(invalidData));
      
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: testFile
      });
      
      expect(result.success).toBe(true);
      expect(result.questionsLoaded).toBe(4);
      expect(result.validQuestions).toBe(2); // Only 2 valid questions
      expect(result.invalidQuestions).toBe(2);
      expect(result.validationErrors).toHaveLength(2);
      
      // Clean up
      fs.unlinkSync(testFile);
    });

    test('should validate difficulty levels', async () => {
      const testData = {
        questions: [
          { question: 'Easy Q', category: 'Test', difficulty: 'easy' },
          { question: 'Medium Q', category: 'Test', difficulty: 'medium' },
          { question: 'Hard Q', category: 'Test', difficulty: 'hard' },
          { question: 'Invalid Q', category: 'Test', difficulty: 'impossible' },
        ]
      };
      
      const testFile = 'test-difficulty.json';
      fs.writeFileSync(testFile, JSON.stringify(testData));
      
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: testFile
      });
      
      expect(result.validQuestions).toBe(3);
      expect(result.invalidQuestions).toBe(1);
      expect(result.validationErrors[0]).toContain('difficulty');
      
      // Clean up
      fs.unlinkSync(testFile);
    });
  });

  describe('Database Operations', () => {
    test('should create questions collection and indexes', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result.success).toBe(true);
      expect(result.collectionCreated).toBe(true);
      expect(result.indexesCreated).toBeGreaterThan(0);
      
      // Verify indexes exist
      const db = mongoose.connection.db;
      const indexes = await db.collection('questions').indexes();
      
      const hasTextIndex = indexes.some(idx => idx.name.includes('text') || Object.keys(idx.key).includes('_fts'));
      const hasCategoryIndex = indexes.some(idx => idx.key.category === 1);
      const hasDifficultyIndex = indexes.some(idx => idx.key.difficulty === 1);
      
      expect(hasTextIndex).toBe(true);
      expect(hasCategoryIndex).toBe(true);
      expect(hasDifficultyIndex).toBe(true);
    });

    test('should insert questions with proper transformation', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result.success).toBe(true);
      expect(result.questionsInserted).toBe(70);
      
      // Verify data in database
      const db = mongoose.connection.db;
      const questions = await db.collection('questions').find({}).toArray();
      
      expect(questions).toHaveLength(70);
      
      // Check first question structure
      const firstQuestion = questions[0];
      expect(firstQuestion).toHaveProperty('question');
      expect(firstQuestion).toHaveProperty('category');
      expect(firstQuestion).toHaveProperty('difficulty');
      expect(firstQuestion).toHaveProperty('createdAt');
      expect(firstQuestion).toHaveProperty('updatedAt');
      
      // Verify no original _id fields are preserved
      expect(firstQuestion._id).toBeDefined();
      expect(firstQuestion._id.toString()).not.toBe('68391ebb56d8135a663284da');
    });

    test('should handle duplicate questions correctly', async () => {
      // First insertion
      const result1 = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result1.questionsInserted).toBe(70);
      
      // Second insertion - should detect duplicates
      const result2 = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result2.success).toBe(true);
      expect(result2.questionsInserted).toBe(0);
      expect(result2.duplicatesSkipped).toBe(70);
      
      // Verify total count is still 70
      const db = mongoose.connection.db;
      const count = await db.collection('questions').countDocuments();
      expect(count).toBe(70);
    });

    test('should support incremental updates', async () => {
      // Insert subset first
      const partialData = {
        questions: [
          { question: 'Test question 1', category: 'Test', difficulty: 'easy' },
          { question: 'Test question 2', category: 'Test', difficulty: 'medium' }
        ]
      };
      
      const testFile = 'test-partial.json';
      fs.writeFileSync(testFile, JSON.stringify(partialData));
      
      const result1 = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: testFile
      });
      
      expect(result1.questionsInserted).toBe(2);
      
      // Add more questions
      const expandedData = {
        questions: [
          ...partialData.questions,
          { question: 'Test question 3', category: 'Test', difficulty: 'hard' }
        ]
      };
      
      fs.writeFileSync(testFile, JSON.stringify(expandedData));
      
      const result2 = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: testFile
      });
      
      expect(result2.questionsInserted).toBe(1);
      expect(result2.duplicatesSkipped).toBe(2);
      
      // Clean up
      fs.unlinkSync(testFile);
    });
  });

  describe('Dry Run Mode', () => {
    test('should validate data without making database changes', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: 'data/questions.json'
      });
      
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.questionsLoaded).toBe(70);
      expect(result.validQuestions).toBe(70);
      expect(result.questionsInserted).toBeUndefined();
      
      // Verify no data was inserted
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      expect(collections).toHaveLength(0);
    });

    test('should detect what would be inserted vs duplicated in dry run', async () => {
      // Insert some data first
      await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      // Run dry run again
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: 'data/questions.json'
      });
      
      expect(result.dryRun).toBe(true);
      expect(result.wouldInsert).toBe(0);
      expect(result.wouldSkip).toBe(70);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const result = await populateQuestions({ 
        mongoUri: 'mongodb://invalid:27017/test',
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('connection');
    });

    test('should handle malformed JSON gracefully', async () => {
      const testFile = 'test-malformed.json';
      fs.writeFileSync(testFile, '{ invalid json syntax');
      
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: testFile
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON');
      
      // Clean up
      fs.unlinkSync(testFile);
    });

    test('should provide detailed error information', async () => {
      const result = await populateQuestions({ 
        mongoUri: 'mongodb://invalid:27017/test',
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Output and Logging', () => {
    test('should provide comprehensive result summary', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('questionsLoaded');
      expect(result).toHaveProperty('validQuestions');
      expect(result).toHaveProperty('questionsInserted');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('executionTime');
    });

    test('should track category distribution', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: true,
        dataFile: 'data/questions.json'
      });
      
      expect(result.categoryStats).toBeDefined();
      expect(Object.keys(result.categoryStats)).toHaveLength(9);
      expect(result.categoryStats['Technical Trade-offs & Architecture']).toBe(10);
      expect(result.categoryStats['Leadership & People']).toBe(10);
    });

    test('should provide execution timing', async () => {
      const result = await populateQuestions({ 
        mongoUri, 
        dryRun: false,
        dataFile: 'data/questions.json'
      });
      
      expect(result.summary.executionTime).toMatch(/\d+ms/);
      expect(result.summary.questionsPerSecond).toBeGreaterThan(0);
    });
  });
}); 