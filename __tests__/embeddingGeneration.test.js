const { generateEmbedding } = require('../scripts/embeddingGeneration')

describe('Embedding Generation', () => {
	test('should generate embeddings from text content', async () => {
		const content = 'When I took leadership of AWS Config, I implemented strategic changes to improve customer retention.'
		
		const embedding = await generateEmbedding(content)
		
		expect(Array.isArray(embedding)).toBe(true)
		expect(embedding.length).toBeGreaterThan(0)
		// OpenAI embeddings are typically 1536 dimensions for text-embedding-ada-002
		expect(embedding.length).toBe(1536)
		expect(embedding.every(val => typeof val === 'number')).toBe(true)
	}, 10000) // Longer timeout for API call

	test('should handle empty content', async () => {
		const embedding = await generateEmbedding('')
		expect(Array.isArray(embedding)).toBe(true)
		expect(embedding.length).toBeGreaterThan(0)
	})

	test('should generate consistent embeddings for same content', async () => {
		const content = 'Test content for embedding consistency'
		
		const embedding1 = await generateEmbedding(content)
		const embedding2 = await generateEmbedding(content)
		
		expect(embedding1.length).toBe(embedding2.length)
		// Should be very similar (embeddings can have small variations)
		const similarity = cosineSimilarity(embedding1, embedding2)
		expect(similarity).toBeGreaterThan(0.95)
	}, 15000)
})

// Helper function to calculate cosine similarity
function cosineSimilarity(a, b) {
	const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
	const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
	const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
	return dotProduct / (magnitudeA * magnitudeB)
} 