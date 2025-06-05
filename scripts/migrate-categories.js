const dbConnect = require('../lib/dbConnect');
const Experience = require('../models/Experience');
const { generateCategory, generateEmbedding } = require('../lib/openai');

const DRY_RUN = !process.argv.includes('--write');

async function migrateCategories() {
  await dbConnect();
  const exps = await Experience.find({});
  let updated = 0;
  let errors = 0;
  
  console.log(`Starting category migration (${DRY_RUN ? 'DRY RUN' : 'WRITE MODE'})...`);
  console.log(`Found ${exps.length} experiences to process`);
  
  for (const exp of exps) {
    const oldCat = exp.metadata?.category || '';
    if (oldCat && oldCat !== 'Uncategorized') {
      console.log(`[SKIP] ${exp.title} already has category: ${oldCat}`);
      continue;
    }
    
    try {
      // Generate new category
      const newCat = await generateCategory({ title: exp.title, content: exp.content });
      console.log(`[UPDATE] ${exp.title}: '${oldCat}' -> '${newCat}'`);
      
      if (!DRY_RUN) {
        // CRITICAL: Regenerate embedding after category change to maintain vector search consistency
        console.log(`[EMBEDDING] Regenerating embedding for: ${exp.title}`);
        const newEmbedding = await generateEmbedding(`${exp.title}\n${exp.content}`);
        
        // Update both category and embedding
        exp.metadata = { ...exp.metadata, category: newCat };
        exp.embedding = newEmbedding;
        await exp.save();
        updated++;
        console.log(`[SUCCESS] Updated experience and embedding for: ${exp.title}`);
      }
    } catch (err) {
      console.error(`[ERROR] Failed to process experience "${exp.title}":`, err.message);
      errors++;
    }
  }
  
  console.log(`\nMigration completed:`);
  console.log(`- Experiences updated: ${updated}`);
  console.log(`- Errors encountered: ${errors}`);
  console.log(`- Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'WRITE MODE (changes saved)'}`);
}

migrateCategories().catch(err => {
  console.error('Migration failed:', err, err.stack);
  process.exit(1);
}); 