const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Function to create a temporary embedding
function createTemporaryEmbedding() {
  return new Array(1536).fill(0.1);
}

// Function to transform project data into experience format
function transformProjectToExperience(project) {
  const star = project.STAR;
  return {
    title: project.story_label,
    description: star.Situation,
    content: `${star.Situation}\n\nTask: ${star.Task}\n\nAction: ${star.Action}\n\nResult: ${star.Result}\n\nReflection: ${star.Reflection}`,
    tags: [
      project.behavioral_theme,
      ...(project.key_attributes || [])
    ],
    embedding: createTemporaryEmbedding(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

async function importData() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('interview-prep');
    
    // Drop existing collections
    console.log('\nDropping existing collections...');
    await db.collection('questions').drop().catch(() => console.log('questions collection did not exist'));
    await db.collection('experiences').drop().catch(() => console.log('experiences collection did not exist'));
    
    // Create collections
    console.log('\nCreating collections...');
    await db.createCollection('questions');
    await db.createCollection('experiences');
    
    // Create indexes for experiences collection
    console.log('\nCreating indexes for experiences collection...');
    await db.collection('experiences').createIndex(
      { title: 'text', description: 'text', content: 'text' },
      { name: 'text_search' }
    );
    
    await db.collection('experiences').createIndex(
      { tags: 1 },
      { name: 'tags' }
    );

    // Import questions
    console.log('\nImporting questions...');
    const questionsPath = path.resolve(__dirname, '../questions.json');
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    if (questionsData.length > 0) {
      await db.collection('questions').insertMany(questionsData);
      console.log(`Imported ${questionsData.length} questions`);
    }

    // Import experiences (from projects.json)
    console.log('\nImporting experiences...');
    const projectsPath = path.resolve(__dirname, '../projects.json');
    const projectsContent = fs.readFileSync(projectsPath, 'utf8')
      .replace(/\$(\d+(\.\d+)?[MKB]?)/g, '\\$$$1') // Escape dollar signs in currency
      .replace(/\\/g, '\\\\'); // Escape backslashes
    
    const projectsData = JSON.parse(projectsContent);
    
    if (projectsData.length > 0) {
      const experiences = projectsData.map(transformProjectToExperience);
      await db.collection('experiences').insertMany(experiences);
      console.log(`Imported ${experiences.length} experiences`);
    }

    // Print collection stats
    const questionsCount = await db.collection('questions').countDocuments();
    const experiencesCount = await db.collection('experiences').countDocuments();
    
    console.log('\nFinal collection counts:');
    console.log(`- questions: ${questionsCount} documents`);
    console.log(`- experiences: ${experiencesCount} documents`);

  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  } finally {
    await client.close();
  }
}

importData().catch(console.error); 