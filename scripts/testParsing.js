const { parseExperiencesFromText } = require('./parseExperiences')
const { processExperience } = require('./importExperiences')
const path = require('path')

async function testParsing() {
	console.log('🔍 Testing experience parsing from text file...\n')

	const filePath = path.join(__dirname, '../data/Caitlyn Shim Project Summaries.txt')
	
	try {
		// Parse raw experiences
		const rawExperiences = parseExperiencesFromText(filePath)
		console.log(`📊 Found ${rawExperiences.length} experiences\n`)

		// Show first few titles
		console.log('📝 Experience titles:')
		rawExperiences.forEach((exp, index) => {
			console.log(`${index + 1}. ${exp.title}`)
		})

		console.log('\n🔄 Processing first experience with full pipeline...\n')
		
		// Process the first experience completely
		if (rawExperiences.length > 0) {
			const processed = await processExperience(rawExperiences[0])
			
			console.log('✅ Processed Experience:')
			console.log('━'.repeat(50))
			console.log(`Title: ${processed.title}`)
			console.log(`Content Length: ${processed.content.length} characters`)
			console.log(`Tags: ${processed.metadata.tags.join(', ')}`)
			console.log(`Embedding Dimensions: ${processed.embedding.length}`)
			console.log(`Category: ${processed.metadata.category}`)
			console.log(`Role: ${processed.metadata.role}`)
			console.log('━'.repeat(50))
			
			console.log('\n📄 Content Preview:')
			console.log(processed.content.substring(0, 200) + '...')
		}

		console.log('\n🎉 Parsing test completed successfully!')
		
	} catch (error) {
		console.error('❌ Error during parsing test:', error)
	}
}

if (require.main === module) {
	testParsing()
}

module.exports = { testParsing } 