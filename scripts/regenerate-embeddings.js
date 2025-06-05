const dbConnect = require('../lib/mongodb');
const Experience = require('../models/Experience');
const { generateEmbedding } = require('../lib/openai');

async function regenerateEmbeddings({ dryRun = true } = {}) {
  const result = {
    totalExperiences: 0,
    experiencesWithoutEmbeddings: 0,
    embeddingsGenerated: 0,
    errors: 0,
    details: []
  };

  try {
    await dbConnect();
    console.log(`[Regenerate Embeddings] Connected to database`);
    
    // Find all experiences
    const experiences = await Experience.find({});
    result.totalExperiences = experiences.length;
    
    console.log(`[Regenerate Embeddings] Found ${experiences.length} total experiences`);
    
    // Filter experiences without embeddings
    const experiencesWithoutEmbeddings = experiences.filter(exp => 
      !exp.embedding || !Array.isArray(exp.embedding) || exp.embedding.length !== 1536
    );
    
    result.experiencesWithoutEmbeddings = experiencesWithoutEmbeddings.length;
    
    console.log(`[Regenerate Embeddings] Found ${experiencesWithoutEmbeddings.length} experiences without valid embeddings`);
    
    if (dryRun) {
      console.log(`[Regenerate Embeddings] DRY RUN MODE - No changes will be made`);
      experiencesWithoutEmbeddings.forEach((exp, index) => {
        console.log(`  ${index + 1}. "${exp.title}" (ID: ${exp._id})`);
      });
      return result;
    }
    
    // Process each experience without embeddings
    for (let i = 0; i < experiencesWithoutEmbeddings.length; i++) {
      const experience = experiencesWithoutEmbeddings[i];
      
      try {
        console.log(`[Regenerate Embeddings] Processing ${i + 1}/${experiencesWithoutEmbeddings.length}: "${experience.title}"`);
        
        // Generate embedding using title + content (same format as other parts of the system)
        const embeddingText = `${experience.title}\n${experience.content}`;
        const embedding = await generateEmbedding(embeddingText);
        
        // Update the experience with the new embedding
        await Experience.updateOne(
          { _id: experience._id },
          { 
            $set: { 
              embedding: embedding,
              updatedAt: new Date()
            }
          }
        );
        
        result.embeddingsGenerated++;
        result.details.push({
          id: experience._id,
          title: experience.title,
          status: 'success'
        });
        
        console.log(`[Regenerate Embeddings] ✅ Generated embedding for "${experience.title}"`);
        
      } catch (error) {
        result.errors++;
        result.details.push({
          id: experience._id,
          title: experience.title,
          status: 'error',
          error: error.message
        });
        
        console.error(`[Regenerate Embeddings] ❌ Failed to generate embedding for "${experience.title}":`, error.message);
      }
    }
    
    console.log(`[Regenerate Embeddings] Complete!`);
    console.log(`  - Total experiences: ${result.totalExperiences}`);
    console.log(`  - Missing embeddings: ${result.experiencesWithoutEmbeddings}`);
    console.log(`  - Embeddings generated: ${result.embeddingsGenerated}`);
    console.log(`  - Errors: ${result.errors}`);
    
    return result;
    
  } catch (error) {
    console.error('[Regenerate Embeddings] Fatal error:', error);
    result.errors++;
    throw error;
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  regenerateEmbeddings({ dryRun })
    .then(result => {
      console.log('Final result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = regenerateEmbeddings; 