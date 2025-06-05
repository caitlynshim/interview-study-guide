const mongoose = require('mongoose')
const OpenAI = require('openai')
require('dotenv').config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

function cosine(a, b) {
  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    const y = b[i]
    dot += x * y
    magA += x * x
    magB += y * y
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

async function run (queryText) {
  await mongoose.connect(process.env.MONGODB_URI)
  const col = mongoose.connection.db.collection('experiences')
  const docs = await col.find({}).project({ title: 1, embedding: 1 }).toArray()
  console.log('docs', docs.length)
  const resp = await openai.embeddings.create({ model: 'text-embedding-ada-002', input: queryText })
  const q = resp.data[0].embedding
  const scored = docs.map(d => ({ title: d.title, sim: cosine(q, d.embedding) }))
  scored.sort((a, b) => b.sim - a.sim)
  console.log('Top 5 similarities:')
  scored.slice(0, 5).forEach(s => console.log(s.title, s.sim))
  await mongoose.disconnect()
}

if (require.main === module) {
  const q = process.argv.slice(2).join(' ') || 'AWS Config'
  run(q).catch(err => { console.error(err); process.exit(1) })
}
