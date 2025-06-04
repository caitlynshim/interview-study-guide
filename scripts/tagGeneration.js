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
 * Generate tags from experience content using OpenAI
 * @param {string} content - The experience content
 * @returns {Promise<string[]>} - Array of generated tags
 */
async function generateTags(content) {
	if (!content || content.trim().length === 0) {
		return []
	}

	// For testing without API key, return mock tags
	if (!openai || !process.env.OPENAI_API_KEY) {
		console.warn('OpenAI API key not available, returning mock tags')
		return ['Strategic Leadership', 'Customer Focus', 'Data Analysis']
	}

	try {
		const prompt = `Analyze the following professional experience and generate 3-6 relevant tags that capture the key skills, themes, and competencies demonstrated. Focus on leadership qualities, technical skills, business impacts, and behavioral patterns.

Experience: "${content}"

Generate tags as a comma-separated list. Keep tags concise (1-3 words each) and professional. Examples: "Strategic Leadership", "Data Analysis", "Customer Focus", "Crisis Management", "Technical Innovation".

Tags:`

		const response = await openai.chat.completions.create({
			model: 'gpt-3.5-turbo',
			messages: [
				{
					role: 'user',
					content: prompt
				}
			],
			max_tokens: 100,
			temperature: 0.3
		})

		const tagsText = response.choices[0]?.message?.content?.trim()
		
		if (!tagsText) {
			return []
		}

		// Parse comma-separated tags and clean them up
		const tags = tagsText
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0)
			.slice(0, 8) // Limit to 8 tags max

		return tags

	} catch (error) {
		console.error('Error generating tags:', error)
		return []
	}
}

module.exports = {
	generateTags
} 