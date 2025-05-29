require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
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

// Function to clean question text
function cleanQuestionText(text) {
  return text
    .replace(/[\r\n]+/g, ' ') // Replace multiple newlines with space
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/^[•\-\*\d.]+/, '') // Remove leading bullets or numbers
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters (emojis, special chars)
    .replace(/\s*[•→⚖️🧠🧨🎧]\s*/g, ' ') // Remove bullet points and emojis with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
    .replace(/([.?!])([a-zA-Z])/g, '$1 $2') // Add space after punctuation if missing
    .replace(/\s*[.]\s*/g, '. ') // Ensure proper spacing around periods
    .replace(/\s*[?]\s*/g, '? ') // Ensure proper spacing around question marks
    .replace(/\s*[!]\s*/g, '! ') // Ensure proper spacing around exclamation marks
    .replace(/\s+/g, ' ') // Clean up spaces again
    .replace(/\([^)]*\)/g, '') // Remove parenthetical content
    .replace(/[^.?!]+(?:[.?!]|$)/g, match => match.trim()) // Trim each sentence
    .replace(/\s+([.?!])/g, '$1') // Remove space before punctuation
    .replace(/vs\./g, 'vs') // Fix "vs." abbreviation
    .replace(/&/g, 'and') // Replace & with 'and'
    .replace(/\s*[-–]\s*/g, ' ') // Replace dashes with space
    .replace(/([a-z])([0-9])/g, '$1 $2') // Add space between text and numbers
    .replace(/([0-9])([a-z])/g, '$1 $2') // Add space between numbers and text
    .replace(/([a-z])<([a-z])/gi, '$1 < $2') // Fix spacing around <
    .replace(/([a-z])>([a-z])/gi, '$1 > $2') // Fix spacing around >
    .replace(/([a-z])vs([a-z])/gi, '$1 vs $2') // Fix spacing around vs
    .replace(/([a-z])why/gi, '$1 why') // Fix common word joins
    .replace(/([a-z])how/gi, '$1 how') // Fix common word joins
    .replace(/([a-z])what/gi, '$1 what') // Fix common word joins
    .replace(/([a-z])when/gi, '$1 when') // Fix common word joins
    .replace(/([a-z])where/gi, '$1 where') // Fix common word joins
    .replace(/\s+/g, ' ') // Clean up spaces again
    .trim();
}

// Function to validate if a line is a question
function isValidQuestion(line) {
  // Remove common non-question content
  if (line.match(/^[\d\s.]*$/)) return false; // Just numbers or whitespace
  if (line.length < 15) return false; // Too short to be a real question
  if (!line.trim()) return false; // Empty lines
  if (line.includes('http')) return false; // URLs
  if (line.match(/^[•\-\*\d]+$/)) return false; // Just bullets or numbers
  if (line.toLowerCase().includes('chapter')) return false; // Chapter headings
  if (line.toLowerCase().includes('section')) return false; // Section headings
  if (line.includes('→')) return false; // Arrow points often indicate metadata
  if (line.match(/^\s*[•→⚖️🧠🧨🎧]/)) return false; // Lines starting with emojis or bullets
  if (line.length > 200) return false; // Too long to be a single question
  if (line.toLowerCase().includes('let me know if')) return false; // Instructions, not questions
  if (line.toLowerCase().includes('use this')) return false; // Instructions, not questions
  if (line.toLowerCase().includes('memory hooks')) return false; // Metadata, not questions
  if (line.toLowerCase().includes('ready stories')) return false; // Metadata, not questions
  if (line.toLowerCase().includes('bullet summary')) return false; // Metadata, not questions
  if (line.toLowerCase().includes('rehearse')) return false; // Instructions, not questions
  if (line.match(/[A-Z]{2,}/)) return false; // Lines with acronyms/abbreviations
  if (line.split(' ').some(word => word.length > 20)) return false; // Words that are too long (likely garbage)
  if (line.toLowerCase().includes('excellence')) return false; // Category headers
  if (line.toLowerCase().includes('crisis')) return false; // Category headers
  if (line.toLowerCase().includes('focus')) return false; // Category headers
  if (line.toLowerCase().includes('management')) return false; // Category headers
  if (line.toLowerCase().includes('specific')) return false; // Category headers
  if (line.toLowerCase().includes('& cross')) return false; // Category headers
  if (line.toLowerCase().includes('walk me through')) return false; // Usually part of a compound question
  if (line.toLowerCase().includes('tell me more')) return false; // Usually a follow-up prompt
  if (line.toLowerCase().includes('give me an example')) return false; // Usually a follow-up prompt
  if (line.toLowerCase().includes('give an example')) return false; // Usually a follow-up prompt
  if (line.toLowerCase().includes('and how')) return false; // Usually part of a compound question
  if (line.toLowerCase().includes('led why')) return false; // Usually part of a compound question
  if (line.toLowerCase().includes('led how')) return false; // Usually part of a compound question
  if (line.toLowerCase().includes('led what')) return false; // Usually part of a compound question
  
  // Check if it looks like a question
  const questionWords = ['what', 'why', 'how', 'when', 'where', 'which', 'explain', 'describe', 'discuss', 'compare', 'contrast', 'tell'];
  const hasQuestionWord = questionWords.some(word => line.toLowerCase().includes(word));
  const endsWithQuestionMark = line.trim().endsWith('?');
  
  return hasQuestionWord || endsWithQuestionMark;
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

// Function to parse questions from text
function parseQuestions(text) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const questions = new Set(); // Use Set to avoid duplicates
  let currentCategory = '';

  for (const line of lines) {
    // Check if this line is a category header
    if (line.match(/^\d+\.\s+/) && (
      line.includes('Leadership & People') ||
      line.includes('Strategy, Product & Innovation') ||
      line.includes('Technical Trade-offs & Architecture') ||
      line.includes('Customer & Field Focus') ||
      line.includes('Stakeholder & Cross-Org Management') ||
      line.includes('Operational Excellence & Crisis') ||
      line.includes('Metrics, Data & Decision Quality') ||
      line.includes('MongoDB-Specific')
    )) {
      currentCategory = line.replace(/^\d+\.\s+/, '').trim();
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
            category: currentCategory || 'Uncategorized',
            difficulty: determineDifficulty(question)
          });
        }
      }
    }
  }

  return Array.from(questions);
}

// Main function to import questions
async function importQuestions() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    // Clear existing questions
    await Question.deleteMany({});
    console.log('Cleared existing questions');

    // Path to the RTF file
    const rtfPath = path.resolve(__dirname, '../questions.rtf');
    console.log('RTF file path:', rtfPath);

    // Convert RTF to text
    console.log('Converting RTF to text...');
    const text = await convertRtfToText(rtfPath);

    // Parse questions
    console.log('Parsing questions...');
    const questions = parseQuestions(text);

    // Import questions to MongoDB
    console.log(`Importing ${questions.length} valid questions...`);
    await Question.insertMany(questions);

    console.log('Questions imported successfully!');
    
    // Print some stats
    const categoryStats = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nQuestion distribution by category:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`${category}: ${count} questions`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error importing questions:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the import
importQuestions(); 