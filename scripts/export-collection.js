#!/usr/bin/env node
// Script: scripts/export-collection.js
// Description: Export documents from any MongoDB Atlas collection to a local JSON file.
// Usage:
//   node scripts/export-collection.js --collection questions --out data/questions.json
// Environment: Requires MONGODB_URI in .env.local or env vars.

const fs = require('fs');
const path = require('path');
const process = require('process');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// ------------------- Helpers -------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (!key || !value) {
      throw new Error('Invalid arguments. Use --collection <name> --out <file>.');
    }
    opts[key] = value;
  }
  if (!opts.collection) {
    throw new Error('Missing required --collection <name> argument.');
  }
  opts.out = opts.out || `${opts.collection}.json`;
  return opts;
}

async function exportCollection({ collection, out }) {
  dotenv.config({ path: '.env.local' });
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not found in environment.');
  }
  await mongoose.connect(uri, { bufferCommands: false });

  const docs = await mongoose.connection.db
    .collection(collection)
    .find({})
    .toArray();

  const outputPath = path.resolve(process.cwd(), out);
  fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2), 'utf-8');

  console.log(`✅ Exported ${docs.length} documents from '${collection}' to ${outputPath}`);

  await mongoose.disconnect();
}

// ------------------- Run via CLI -------------------
if (require.main === module) {
  (async () => {
    try {
      const opts = parseArgs();
      await exportCollection(opts);
    } catch (err) {
      console.error('❌ Export failed:', err.message);
      process.exitCode = 1;
    }
  })();
}

module.exports = { exportCollection }; 