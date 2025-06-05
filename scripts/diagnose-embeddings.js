const mongoose = require('mongoose')
const OpenAI = require('openai')
require('dotenv').config({ path: '.env.local' })

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
})

async function diagnoseEmbeddings() {
	try {
		// Connect to MongoDB
		await mongoose.connect(process.env.MONGODB_URI)
		console.log('Connected to MongoDB')

		const db = mongoose.connection.db
		const collection = db.collection('experiences')

		// Get all experiences with embeddings
		console.log('\n=== CHECKING EXPERIENCES AND EMBEDDINGS ===')
		const experiences = await collection.find({}).toArray()
		console.log(`Total experiences in collection: ${experiences.length}`)

		let withEmbeddings = 0
		let withoutEmbeddings = 0
		let embeddingTypes = new Set()

		for (const exp of experiences) {
			if (exp.embedding) {
				withEmbeddings++
				
				// Check BSON type
				const embeddingType = typeof exp.embedding[0]
				embeddingTypes.add(embeddingType)
				
				console.log(`\nExperience: ${exp.title}`)
				console.log(`  Embedding length: ${exp.embedding.length}`)
				console.log(`  First value type: ${embeddingType}`)
				console.log(`  First value: ${exp.embedding[0]}`)
				console.log(`  Sample values: [${exp.embedding.slice(0, 3).join(', ')}...]`)
			} else {
				withoutEmbeddings++
				console.log(`\nExperience: ${exp.title} - NO EMBEDDING`)
			}
		}

		console.log(`\n=== SUMMARY ===`)
		console.log(`Experiences with embeddings: ${withEmbeddings}`)
		console.log(`Experiences without embeddings: ${withoutEmbeddings}`)
		console.log(`Embedding types found: ${Array.from(embeddingTypes).join(', ')}`)

		// Test vector search directly
		if (withEmbeddings > 0) {
			console.log('\n=== TESTING VECTOR SEARCH DIRECTLY ===')
			
			// Generate a test query embedding
			const testQuery = "project management and team leadership"
			console.log(`Test query: "${testQuery}"`)
			
			const embeddingResponse = await openai.embeddings.create({
				model: 'text-embedding-ada-002',
				input: testQuery
			})
			const queryEmbedding = embeddingResponse.data[0].embedding
			console.log(`Query embedding generated: ${queryEmbedding.length} dimensions`)

			// Test the vector search pipeline directly
			const pipeline = [
				{
					$search: {
						knnBeta: {
							vector: queryEmbedding,
							path: "embedding",
							k: 100
						}
					}
				},
				{
					$addFields: {
						score: { $meta: "searchScore" }
					}
				},
				{
					$project: {
						title: 1,
						content: 1,
						score: 1,
						embedding: { $slice: ["$embedding", 3] } // Just first 3 values for debug
					}
				}
			]

			console.log('\nExecuting vector search pipeline...')
			const vectorResults = await collection.aggregate(pipeline).toArray()
			console.log(`Vector search returned ${vectorResults.length} results`)
			
			if (vectorResults.length > 0) {
				console.log('\nTop results:')
				vectorResults.slice(0, 3).forEach((result, i) => {
					console.log(`  ${i + 1}. ${result.title} (score: ${result.score})`)
					console.log(`     Embedding sample: [${result.embedding.join(', ')}...]`)
				})
			} else {
				console.log('No vector search results found')
				
				// Try a simplified search
				console.log('\nTrying simplified knnBeta search...')
				const simpleResults = await collection.aggregate([
					{
						$search: {
							knnBeta: {
								vector: queryEmbedding,
								path: "embedding",
								k: 10
							}
						}
					},
					{
						$limit: 5
					},
					{
						$project: {
							title: 1,
							hasEmbedding: { $type: "$embedding" }
						}
					}
				]).toArray()
				
				console.log(`Simplified search returned ${simpleResults.length} results`)
				simpleResults.forEach(result => {
					console.log(`  - ${result.title} (embedding type: ${result.hasEmbedding})`)
				})
			}
		}

		// Check if vector search index exists
		console.log('\n=== CHECKING INDEXES ===')
		const indexes = await collection.indexes()
		console.log('Available indexes:')
		indexes.forEach(index => {
			console.log(`  - ${JSON.stringify(index.key)} (${index.name})`)
		})

	} catch (error) {
		console.error('Error in diagnosis:', error)
	} finally {
		await mongoose.disconnect()
		console.log('\nDisconnected from MongoDB')
	}
}

// Run the diagnosis
diagnoseEmbeddings() 