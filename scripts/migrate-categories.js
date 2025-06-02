const dbConnect = require('../lib/dbConnect');
const Experience = require('../models/Experience');
const { generateCategory } = require('../lib/openai');

const DRY_RUN = !process.argv.includes('--write');

async function migrateCategories() {
  await dbConnect();
  const exps = await Experience.find({});
  let updated = 0;
  for (const exp of exps) {
    const oldCat = exp.metadata?.category || '';
    if (oldCat && oldCat !== 'Uncategorized') {
      console.log(`[SKIP] ${exp.title} already has category: ${oldCat}`);
      continue;
    }
    const newCat = await generateCategory({ title: exp.title, content: exp.content });
    console.log(`[UPDATE] ${exp.title}: '${oldCat}' -> '${newCat}'`);
    if (!DRY_RUN) {
      exp.metadata = { ...exp.metadata, category: newCat };
      await exp.save();
      updated++;
    }
  }
  console.log(`Done. ${updated} experiences updated.`);
}

migrateCategories().catch(err => {
  console.error('Migration failed:', err, err.stack);
  process.exit(1);
}); 