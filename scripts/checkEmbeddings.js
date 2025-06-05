require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')
const Experience = require('../models/Experience')

async function checkEmbeddings () {
  await mongoose.connect(process.env.MONGODB_URI)
  const total = await Experience.countDocuments()
  const withEmb = await Experience.countDocuments({ 'embedding.1535': { $exists: true } })
  const sample = await Experience.findOne().select('title embedding').lean()
  console.log('Total docs:', total)
  console.log('Docs with 1536-dim embeddings:', withEmb)
  if (sample) {
    console.log(`Sample "${sample.title}" embedding length:`, sample.embedding.length)
  }
  await mongoose.disconnect()
}

if (require.main === module) {
  checkEmbeddings()
} 