const mongoose = require('mongoose')
const OpenAI = require('openai')
require('dotenv').config({ path: '.env.local' })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SAFETY_TIMEOUT_MS = 30000
const timer = setTimeout(() => {
  console.error('testVectorSearch.js: Timed out after 30s – forcing exit')
  process.exit(1)
}, SAFETY_TIMEOUT_MS)

async function run () {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    const db = mongoose.connection.db
    const col = db.collection('experiences')
    const resp = await openai.embeddings.create({ model: 'text-embedding-ada-002', input: 'AWS Config' })
    const queryEmbedding = resp.data[0].embedding

    // Try $vectorSearch
    const vectorPipeline = [
      {
        $vectorSearch: {
          index: 'vector_search',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5
        }
      },
      {
        $project: {
          title: 1,
          content: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ]

    const results = await col.aggregate(vectorPipeline).toArray()
    console.log('vectorSearch results:', results.length)
    results.forEach(r => console.log(r.title, r.score))

    // Try $search knnBeta
    const searchPipeline = [
      {
        $search: {
          index: 'vector_search',
          knnBeta: {
            vector: queryEmbedding,
            path: 'embedding',
            k: 5,
            numCandidates: 100
          }
        }
      },
      {
        $project: {
          title: 1,
          score: { $meta: 'searchScore' }
        }
      }
    ]
    const res2 = await col.aggregate(searchPipeline).toArray()
    console.log('search knnBeta results:', res2.length)
    res2.forEach(r => console.log(r.title, r.score))

    await mongoose.disconnect()
  } catch (err) {
    console.error('Error during vector search test:', err)
  } finally {
    clearTimeout(timer)
    process.exit(0)
  }
}
run().catch(console.error) 