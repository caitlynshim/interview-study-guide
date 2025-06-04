require('dotenv').config({ path: '.env.local' })
const OpenAI = require('openai')

let openai = null

// Only initialize OpenAI if API key is available
if (process.env.OPENAI_API_KEY) {
	openai = new OpenAI({
		apiKey: process.env.OPENAI_API_KEY
	})
}

/**
 * Simple hash function to generate consistent mock embeddings
 */
function simpleHash(str) {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = ((hash << 5) - hash) + char
		hash = hash & hash // Convert to 32-bit integer
	}
	return Math.abs(hash)
}

/**
 * Generate embedding from text content using OpenAI
 * @param {string} text - The text content to embed
 * @returns {Promise<number[]>} - Array of embedding values
 */
async function generateEmbedding(text) {
	if (!text || text.trim().length === 0) {
		text = 'empty content'
	}

	// For testing without API key, return mock embedding
	if (!openai || !process.env.OPENAI_API_KEY) {
		console.warn('OpenAI API key not available, returning mock embedding')
		// Generate consistent mock embedding based on text content
		const seed = simpleHash(text)
		const mockEmbedding = []
		for (let i = 0; i < 1536; i++) {
			// Use a simple deterministic pseudo-random based on seed and index
			const value = Math.sin(seed + i) * 2 - 1
			mockEmbedding.push(value)
		}
		return mockEmbedding
	}

	try {
		const response = await openai.embeddings.create({
			model: 'text-embedding-ada-002',
			input: text.substring(0, 8000) // Truncate to stay within token limits
		})

		return response.data[0].embedding

	} catch (error) {
		console.error('Error generating embedding:', error)
		// Return a consistent mock embedding on error
		const seed = simpleHash(text)
		const mockEmbedding = []
		for (let i = 0; i < 1536; i++) {
			const value = Math.sin(seed + i) * 2 - 1
			mockEmbedding.push(value)
		}
		return mockEmbedding
	}
}

module.exports = {
	generateEmbedding
} 