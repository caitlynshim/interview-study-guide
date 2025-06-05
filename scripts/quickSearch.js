const mongoose = require('mongoose')
const OpenAI = require('openai')
require('dotenv').config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function run (queryText) {
  await mongoose.connect(process.env.MONGODB_URI)
  const col = mongoose.connection.db.collection('experiences')
  const resp = await openai.embeddings.create({ model: 'text-embedding-ada-002', input: queryText })
  const vector = resp.data[0].embedding

  // Try $vectorSearch
  const vectorPipeline = [
    {
      $vectorSearch: {
        index: 'vector_search_bin',
        path: 'embeddingBin',
        queryVector: vector,
        numCandidates: 100,
        limit: 12
      }
    },
    { $project: { title: 1, score: { $meta: 'vectorSearchScore' } } }
  ]
  const vecRes = await col.aggregate(vectorPipeline).toArray()
  console.log(`vectorSearch results for "${queryText}": ${vecRes.length}`)
  vecRes.forEach(r => console.log(r.title, r.score))

  await mongoose.disconnect()
}

if (require.main === module) {
  const q = process.argv.slice(2).join(' ') || 'AWS Config'
  run(q).catch(err => { console.error(err); process.exit(1) })
} 