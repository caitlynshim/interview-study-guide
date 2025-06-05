const dbConnect = require('../lib/dbConnect');
const Experience = require('../models/Experience');

async function validateEmbeddings() {
  try {
    await dbConnect();
    
    console.log('🔍 Starting embedding validation audit...\n');
    
    const experiences = await Experience.find({});
    console.log(`📊 Found ${experiences.length} experiences to validate\n`);
    
    if (experiences.length === 0) {
      console.log('ℹ️  No experiences found in database');
      return { valid: 0, invalid: 0, total: 0, issues: [] };
    }
    
    let validCount = 0;
    let invalidCount = 0;
    const issues = [];
    
    for (const exp of experiences) {
      const validation = validateSingleEmbedding(exp);
      
      if (validation.isValid) {
        validCount++;
        console.log(`✅ ${exp.title}: Valid embedding (${validation.dimensions} dimensions)`);
      } else {
        invalidCount++;
        console.log(`❌ ${exp.title}: ${validation.issues.join(', ')}`);
        issues.push({
          experienceId: exp._id,
          title: exp.title,
          issues: validation.issues
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 EMBEDDING VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Valid embeddings: ${validCount}/${experiences.length}`);
    console.log(`❌ Invalid embeddings: ${invalidCount}/${experiences.length}`);
    console.log(`📊 Success rate: ${((validCount / experiences.length) * 100).toFixed(1)}%`);
    
    if (issues.length > 0) {
      console.log('\n🚨 ISSUES FOUND:');
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.title} (${issue.experienceId})`);
        issue.issues.forEach(problem => console.log(`   - ${problem}`));
      });
      
      console.log('\n⚠️  RECOMMENDATION: Run embedding regeneration for invalid experiences');
      console.log('   Use: node scripts/regenerate-embeddings.js --experience-ids=' + 
        issues.map(i => i.experienceId).join(','));
    } else {
      console.log('\n🎉 All embeddings are valid! Vector search consistency is maintained.');
    }
    
    return {
      valid: validCount,
      invalid: invalidCount,
      total: experiences.length,
      issues: issues
    };
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

function validateSingleEmbedding(experience) {
  const issues = [];
  
  // Check if embedding exists
  if (!experience.embedding) {
    issues.push('Missing embedding field');
    return { isValid: false, issues, dimensions: 0 };
  }
  
  // Check if embedding is an array
  if (!Array.isArray(experience.embedding)) {
    issues.push('Embedding is not an array');
    return { isValid: false, issues, dimensions: 0 };
  }
  
  // Check for placeholder embedding
  if (experience.embedding.length === 1 && experience.embedding[0] === 0) {
    issues.push('Placeholder embedding detected ([0])');
    return { isValid: false, issues, dimensions: 1 };
  }
  
  // Check for empty embedding
  if (experience.embedding.length === 0) {
    issues.push('Empty embedding array');
    return { isValid: false, issues, dimensions: 0 };
  }
  
  // Check for correct dimensions (text-embedding-ada-002 = 1536)
  const expectedDimensions = 1536;
  if (experience.embedding.length !== expectedDimensions) {
    issues.push(`Incorrect dimensions: ${experience.embedding.length}, expected ${expectedDimensions}`);
    return { isValid: false, issues, dimensions: experience.embedding.length };
  }
  
  // Check for all zeros (invalid embedding)
  const allZeros = experience.embedding.every(val => val === 0);
  if (allZeros) {
    issues.push('All embedding values are zero (invalid)');
    return { isValid: false, issues, dimensions: experience.embedding.length };
  }
  
  // Check for valid numbers
  const hasInvalidNumbers = experience.embedding.some(val => 
    typeof val !== 'number' || isNaN(val) || !isFinite(val)
  );
  if (hasInvalidNumbers) {
    issues.push('Contains invalid numbers (NaN, Infinity, or non-numeric values)');
    return { isValid: false, issues, dimensions: experience.embedding.length };
  }
  
  // Check embedding magnitude (should be normalized, roughly around 1.0)
  const magnitude = Math.sqrt(experience.embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude < 0.1 || magnitude > 10.0) {
    issues.push(`Unusual embedding magnitude: ${magnitude.toFixed(4)} (expected ~1.0)`);
    return { isValid: false, issues, dimensions: experience.embedding.length };
  }
  
  return { 
    isValid: true, 
    issues: [], 
    dimensions: experience.embedding.length,
    magnitude: magnitude
  };
}

// CLI execution
if (require.main === module) {
  validateEmbeddings()
    .then(result => {
      const exitCode = result.invalid > 0 ? 1 : 0;
      console.log(`\n${exitCode === 0 ? '✅' : '❌'} Validation completed`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('\n❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = {
  validateEmbeddings,
  validateSingleEmbedding
}; 