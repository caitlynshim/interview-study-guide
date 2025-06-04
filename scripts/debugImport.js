require('dotenv').config({ path: '.env.local' })
const { parseExperiencesFromText } = require('./parseExperiences')
const { processExperience } = require('./importExperiences')
const path = require('path')

async function debugImport() {
	console.log('🔍 Debugging import issues...\n')

	const filePath = path.join(__dirname, '../data/Caitlyn Shim Project Summaries.txt')
	
	try {
		// Parse experiences
		const rawExperiences = parseExperiencesFromText(filePath)
		console.log(`📊 Found ${rawExperiences.length} experiences\n`)

		// Check each parsed experience
		for (let i = 0; i < rawExperiences.length; i++) {
			const exp = rawExperiences[i]
			console.log(`Experience ${i + 1}:`)
			console.log(`  Title: "${exp.title}" (length: ${exp.title.length})`)
			console.log(`  Content: "${exp.content.substring(0, 50)}..." (length: ${exp.content.length})`)
			console.log(`  Content empty? ${exp.content === ''}`)
			console.log(`  Content null/undefined? ${exp.content == null}`)
			console.log('---')
		}

		// Try processing one experience
		console.log('\n🔄 Processing first experience...')
		const processed = await processExperience(rawExperiences[0])
		
		console.log('✅ Processed successfully:')
		console.log(`  Title: "${processed.title}"`)
		console.log(`  Content length: ${processed.content.length}`)
		console.log(`  Has embedding: ${Array.isArray(processed.embedding)}`)
		console.log(`  Has metadata: ${!!processed.metadata}`)
		console.log(`  Has tags: ${Array.isArray(processed.metadata?.tags)}`)

	} catch (error) {
		console.error('❌ Debug failed:', error)
		console.error('Stack:', error.stack)
	}
}

if (require.main === module) {
	debugImport()
}

module.exports = { debugImport } 