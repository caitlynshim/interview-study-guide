require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { spawn } = require('child_process');
const Question = require('./QuestionModel');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

// Function to convert RTF to text using textutil (macOS)
async function convertRtfToText(rtfPath) {
  return new Promise((resolve, reject) => {
    const textutil = spawn('textutil', ['-convert', 'txt', '-stdout', rtfPath]);
    let data = '';

    textutil.stdout.on('data', (chunk) => {
      data += chunk;
    });

    textutil.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    textutil.on('close', (code) => {
      if (code === 0) {
        resolve(data);
      } else {
        reject(new Error(`textutil process exited with code ${code}`));
      }
    });
  });
}

// Function to determine question difficulty
function determineDifficulty(question) {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('basic') || 
      lowerQuestion.includes('simple') || 
      lowerQuestion.includes('fundamental')) {
    return 'easy';
  }
  
  if (lowerQuestion.includes('advanced') || 
      lowerQuestion.includes('complex') || 
      lowerQuestion.includes('challenging') || 
      lowerQuestion.includes('difficult')) {
    return 'hard';
  }
  
  return 'medium';
}

// Function to clean question text
function cleanQuestionText(text) {
  return text
    .replace(/^\d+\.\s*/, '') // Remove leading numbers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Function to validate a question
function isValidQuestion(text) {
  const minLength = 10;
  const maxLength = 500;
  
  return text.length >= minLength && 
         text.length <= maxLength && 
         (text.endsWith('?') || text.endsWith('.'));
}

// Function to parse questions from text
function parseQuestions(text) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const questions = new Set(); // Use Set to avoid duplicates
  let currentCategory = '';

  for (const line of lines) {
    // Check if this line is a category header
    if (line.match(/^[A-Z][A-Za-z\s&-]+$/)) {
      currentCategory = line.trim();
      continue;
    }

    // Split compound questions
    const cleanedLine = cleanQuestionText(line);
    const potentialQuestions = cleanedLine
      .split(/(?<=[.?!])\s+/)
      .filter(q => q.length > 0)
      .map(q => q.trim());

    for (const question of potentialQuestions) {
      if (isValidQuestion(question)) {
        // Create a normalized version for deduplication
        const normalizedQuestion = question.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Only add if we haven't seen this question before
        if (!Array.from(questions).some(q => q.question.toLowerCase().replace(/\s+/g, ' ').trim() === normalizedQuestion)) {
          questions.add({
            question,
            category: currentCategory || 'General',
            difficulty: determineDifficulty(question)
          });
        }
      }
    }
  }

  return Array.from(questions);
}

// Function to import questions from JSON
async function importJsonQuestions(client) {
  try {
    const jsonPath = path.resolve(__dirname, '../questions.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const questions = JSON.parse(jsonContent);
    
    // Add difficulty if not present
    const processedQuestions = questions.map(q => ({
      ...q,
      difficulty: q.difficulty || determineDifficulty(q.question)
    }));

    if (processedQuestions.length > 0) {
      await client.db('interview-prep').collection('questions').insertMany(processedQuestions);
      console.log(`Imported ${processedQuestions.length} questions from JSON`);
    }
  } catch (error) {
    console.error('Error importing JSON questions:', error);
  }
}

// Main function to import questions
async function importQuestions() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    // Clear existing questions
    await client.db('interview-prep').collection('questions').deleteMany({});
    console.log('Cleared existing questions');

    // Import from JSON first
    await importJsonQuestions(client);

    // Path to the RTF file
    const rtfPath = path.resolve(__dirname, '../questions.rtf');
    
    // Convert RTF to text
    console.log('Converting RTF to text...');
    const text = await convertRtfToText(rtfPath);

    // Parse questions
    console.log('Parsing questions from RTF...');
    const questions = parseQuestions(text);

    if (questions.length > 0) {
      // Import questions to MongoDB
      await client.db('interview-prep').collection('questions').insertMany(questions);
      console.log(`Imported ${questions.length} questions from RTF`);
    }

    // Print stats
    const stats = await client.db('interview-prep').collection('questions').aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('\nQuestion distribution by category:');
    stats.forEach(({ _id, count }) => {
      console.log(`${_id}: ${count} questions`);
    });

  } catch (error) {
    console.error('Error importing questions:', error);
  } finally {
    await client.close();
  }
}

// Run the import
importQuestions().catch(console.error); 