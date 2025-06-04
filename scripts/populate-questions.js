const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

/**
 * MongoDB Questions Population Script
 * Populates the questions collection from JSON data with validation and duplicate detection
 * 
 * Features:
 * - Data validation and transformation
 * - Duplicate detection and handling
 * - Dry run mode for testing
 * - Comprehensive error handling
 * - Performance tracking
 */

async function populateQuestions(options = {}) {
  const startTime = Date.now();
  const result = {
    success: false,
    timestamp: new Date().toISOString(),
    dryRun: options.dryRun || false,
    questionsLoaded: 0,
    validQuestions: 0,
    invalidQuestions: 0,
    questionsInserted: 0,
    duplicatesSkipped: 0,
    categories: [],
    categoryStats: {},
    validationErrors: [],
    collectionCreated: false,
    indexesCreated: 0,
    summary: {},
    error: null
  };

  try {
    // Load and validate data
    const dataFile = options.dataFile || 'data/questions.json';
    const questionsData = await loadAndValidateData(dataFile, result);
    
    if (!questionsData) {
      return result; // Error already set in loadAndValidateData
    }

    // Connect to database
    const mongoUri = options.mongoUri || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is required. Please set it in environment variables or pass as option.');
    }

    console.log(`🔗 Connecting to MongoDB...${result.dryRun ? ' (DRY RUN)' : ''}`);
    await mongoose.connect(mongoUri, { bufferCommands: false });
    console.log('✅ Connected to MongoDB successfully');

    if (result.dryRun) {
      // Dry run mode - validate against existing data if collection exists
      await performDryRunAnalysis(questionsData.validQuestions, result);
    } else {
      // Actual execution
      await setupCollection(result);
      await insertQuestions(questionsData.validQuestions, result);
    }

    // Generate summary
    const executionTime = Date.now() - startTime;
    result.summary = {
      executionTime: `${executionTime}ms`,
      questionsPerSecond: result.questionsInserted > 0 ? Math.round((result.questionsInserted * 1000) / executionTime) : 0,
      categoriesFound: Object.keys(result.categoryStats).length,
      totalValidQuestions: result.validQuestions,
      totalInvalidQuestions: result.invalidQuestions
    };

    result.success = true;
    console.log('\n🎉 Questions population completed successfully!');
    console.log(`📊 Summary: ${result.questionsInserted} inserted, ${result.duplicatesSkipped} duplicates skipped`);

  } catch (error) {
    result.success = false;
    result.error = error.message;
    console.error('❌ Questions population failed:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }

  return result;
}

/**
 * Load and validate questions data from JSON file
 */
async function loadAndValidateData(dataFile, result) {
  console.log(`📂 Loading questions from: ${dataFile}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(dataFile)) {
      throw new Error(`Data file not found: ${dataFile}`);
    }

    // Load and parse JSON
    const rawData = fs.readFileSync(dataFile, 'utf8');
    const data = JSON.parse(rawData);
    
    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid data format: questions array not found');
    }

    console.log(`📋 Loaded ${data.questions.length} questions from file`);
    result.questionsLoaded = data.questions.length;

    // Validate and transform questions
    const validQuestions = [];
    const validationErrors = [];
    const categoryStats = {};

    for (const [index, question] of data.questions.entries()) {
      const validation = validateQuestion(question, index);
      
      if (validation.valid) {
        const transformedQuestion = transformQuestion(question);
        validQuestions.push(transformedQuestion);
        
        // Track categories
        if (!categoryStats[transformedQuestion.category]) {
          categoryStats[transformedQuestion.category] = 0;
        }
        categoryStats[transformedQuestion.category]++;
      } else {
        validationErrors.push(...validation.errors);
      }
    }

    result.validQuestions = validQuestions.length;
    result.invalidQuestions = result.questionsLoaded - result.validQuestions;
    result.validationErrors = validationErrors;
    result.categories = Object.keys(categoryStats);
    result.categoryStats = categoryStats;

    console.log(`✅ Validated ${result.validQuestions} valid questions`);
    if (result.invalidQuestions > 0) {
      console.log(`⚠️  Found ${result.invalidQuestions} invalid questions`);
    }

    return { validQuestions, categoryStats };

  } catch (error) {
    if (error.message.includes('file not found')) {
      result.error = `Data file not found: ${dataFile}`;
    } else if (error instanceof SyntaxError) {
      result.error = `Invalid JSON format in ${dataFile}: ${error.message}`;
    } else {
      result.error = error.message;
    }
    return null;
  }
}

/**
 * Validate individual question structure
 */
function validateQuestion(question, index) {
  const errors = [];
  const validDifficulties = ['easy', 'medium', 'hard'];

  // Check required fields
  if (!question.question || typeof question.question !== 'string' || question.question.trim() === '') {
    errors.push(`Question ${index}: Missing or empty question text`);
  }

  if (!question.category || typeof question.category !== 'string') {
    errors.push(`Question ${index}: Missing or invalid category`);
  }

  if (!question.difficulty || !validDifficulties.includes(question.difficulty)) {
    errors.push(`Question ${index}: Invalid difficulty level. Must be one of: ${validDifficulties.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Transform question data for database insertion
 */
function transformQuestion(question) {
  const now = new Date();
  
  return {
    question: question.question.trim(),
    category: question.category.trim(),
    difficulty: question.difficulty.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    // Note: We don't preserve the original _id - let MongoDB generate new ones
  };
}

/**
 * Perform dry run analysis without making changes
 */
async function performDryRunAnalysis(validQuestions, result) {
  console.log('\n🏃 DRY RUN MODE - Analyzing what would be done...');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const questionsCollectionExists = collections.some(c => c.name === 'questions');
    
    if (!questionsCollectionExists) {
      result.wouldInsert = validQuestions.length;
      result.wouldSkip = 0;
      console.log(`📊 Would create questions collection and insert ${result.wouldInsert} questions`);
    } else {
      // Check for duplicates
      const existingQuestions = await db.collection('questions').find({}, { projection: { question: 1, category: 1 } }).toArray();
      const existingSet = new Set(existingQuestions.map(q => `${q.question}|||${q.category}`));
      
      let wouldInsert = 0;
      let wouldSkip = 0;
      
      for (const question of validQuestions) {
        const key = `${question.question}|||${question.category}`;
        if (existingSet.has(key)) {
          wouldSkip++;
        } else {
          wouldInsert++;
        }
      }
      
      result.wouldInsert = wouldInsert;
      result.wouldSkip = wouldSkip;
      console.log(`📊 Would insert ${wouldInsert} new questions, skip ${wouldSkip} duplicates`);
    }
  } catch (error) {
    console.log('📊 Unable to check existing data, would attempt fresh insert');
    result.wouldInsert = validQuestions.length;
    result.wouldSkip = 0;
  }
}

/**
 * Setup questions collection and indexes
 */
async function setupCollection(result) {
  console.log('\n📁 Setting up questions collection...');
  
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const questionsCollectionExists = collections.some(c => c.name === 'questions');
  
  if (!questionsCollectionExists) {
    await db.createCollection('questions');
    result.collectionCreated = true;
    console.log('✅ Created questions collection');
  } else {
    console.log('ℹ️  Questions collection already exists');
  }

  // Create indexes (idempotent)
  const collection = db.collection('questions');
  
  try {
    // Text index on question field
    await collection.createIndex({ question: 'text' });
    result.indexesCreated++;
    console.log('✅ Text index on question field');

    // Index on category field
    await collection.createIndex({ category: 1 });
    result.indexesCreated++;
    console.log('✅ Index on category field');

    // Index on difficulty field
    await collection.createIndex({ difficulty: 1 });
    result.indexesCreated++;
    console.log('✅ Index on difficulty field');

  } catch (error) {
    // Indexes might already exist, that's OK
    console.log('ℹ️  Some indexes may already exist');
  }
}

/**
 * Insert questions with duplicate detection
 */
async function insertQuestions(validQuestions, result) {
  console.log('\n📝 Inserting questions...');
  
  const db = mongoose.connection.db;
  const collection = db.collection('questions');
  
  // Check for existing questions to avoid duplicates
  const existingQuestions = await collection.find({}, { projection: { question: 1, category: 1 } }).toArray();
  const existingSet = new Set(existingQuestions.map(q => `${q.question}|||${q.category}`));
  
  const questionsToInsert = [];
  let duplicatesSkipped = 0;
  
  for (const question of validQuestions) {
    const key = `${question.question}|||${question.category}`;
    if (existingSet.has(key)) {
      duplicatesSkipped++;
    } else {
      questionsToInsert.push(question);
    }
  }
  
  result.duplicatesSkipped = duplicatesSkipped;
  
  if (questionsToInsert.length > 0) {
    await collection.insertMany(questionsToInsert);
    result.questionsInserted = questionsToInsert.length;
    console.log(`✅ Inserted ${questionsToInsert.length} new questions`);
  } else {
    console.log('ℹ️  No new questions to insert');
  }
  
  if (duplicatesSkipped > 0) {
    console.log(`ℹ️  Skipped ${duplicatesSkipped} duplicate questions`);
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const mongoUri = args.find(arg => arg.startsWith('--uri='))?.split('=')[1];
  const dataFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

  console.log('🚀 MongoDB Questions Population Script');
  console.log('=====================================\n');

  const result = await populateQuestions({ mongoUri, dryRun, dataFile });

  if (result.success) {
    console.log('\n📋 Population Summary:');
    console.log(`   Questions loaded: ${result.questionsLoaded}`);
    console.log(`   Valid questions: ${result.validQuestions}`);
    console.log(`   Invalid questions: ${result.invalidQuestions}`);
    if (!result.dryRun) {
      console.log(`   Questions inserted: ${result.questionsInserted}`);
      console.log(`   Duplicates skipped: ${result.duplicatesSkipped}`);
    } else {
      console.log(`   Would insert: ${result.wouldInsert || 'N/A'}`);
      console.log(`   Would skip: ${result.wouldSkip || 'N/A'}`);
    }
    console.log(`   Categories: ${result.categories.length}`);
    console.log(`   Execution time: ${result.summary.executionTime}`);
    
    if (result.validationErrors.length > 0) {
      console.log('\n⚠️  Validation Errors:');
      result.validationErrors.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n📊 Category Distribution:');
    Object.entries(result.categoryStats).forEach(([category, count]) => {
      console.log(`   • ${category}: ${count} questions`);
    });
  } else {
    console.error(`\n❌ Population failed: ${result.error}`);
    process.exit(1);
  }
}

// Export for testing
module.exports = populateQuestions;

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
} 