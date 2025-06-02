require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const Question = require('./QuestionModel');

const MONGODB_URI = process.env.MONGODB_URI;

async function sampleQuestions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas\n');

    const categories = ['General', 'Database', 'System Design', 'Leadership'];
    
    for (const category of categories) {
      console.log(`=== ${category} Questions ===`);
      const questions = await Question.aggregate([
        { $match: { category } },
        { $sample: { size: 2 } }
      ]);
      
      questions.forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.question}`);
        console.log(`   Difficulty: ${q.difficulty}`);
      });
      console.log('\n');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

sampleQuestions(); 