const fs = require('fs')
const path = require('path')
const { parseExperiencesFromText } = require('./parseExperiences')
const { processExperience } = require('./importExperiences')

async function generateExperiencesLocal() {
	console.log('🚀 Generating experiences.json locally (no database connection)...\n')

	const filePath = path.join(__dirname, '../data/Caitlyn Shim Project Summaries.txt')
	const outputPath = path.join(__dirname, '../data/experiences.json')
	
	try {
		// Parse experiences from text file
		console.log('📖 Parsing experiences from text file...')
		const rawExperiences = parseExperiencesFromText(filePath)
		console.log(`✓ Found ${rawExperiences.length} experiences\n`)

		// Process each experience
		const processedExperiences = []
		let errorCount = 0

		console.log('🔄 Processing experiences...')
		for (let i = 0; i < rawExperiences.length; i++) {
			try {
				const processed = await processExperience(rawExperiences[i])
				processedExperiences.push(processed)
				console.log(`✓ Processed ${i + 1}/${rawExperiences.length}: ${processed.title}`)
			} catch (error) {
				console.error(`✗ Failed to process experience ${i + 1}:`, error.message)
				errorCount++
			}
		}

		// Save to JSON file
		if (processedExperiences.length > 0) {
			console.log(`\n💾 Saving ${processedExperiences.length} experiences to ${outputPath}...`)
			fs.writeFileSync(outputPath, JSON.stringify(processedExperiences, null, 2))
			console.log('✓ Experiences saved successfully!')

			// Show summary
			console.log('\n📊 Generation Summary:')
			console.log('━'.repeat(50))
			console.log(`Total experiences processed: ${processedExperiences.length}`)
			console.log(`Errors: ${errorCount}`)
			console.log(`Output file: ${outputPath}`)
			console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`)
			console.log('━'.repeat(50))

			// Show sample data structure
			console.log('\n📋 Sample Experience Structure:')
			const sample = processedExperiences[0]
			console.log(JSON.stringify({
				title: sample.title,
				content: sample.content.substring(0, 100) + '...',
				metadata: sample.metadata,
				embedding: `[${sample.embedding.length} dimensions]`
			}, null, 2))
		}

		console.log('\n🎉 Local generation completed successfully!')
		
		return {
			processed: processedExperiences.length,
			errors: errorCount,
			outputFile: outputPath
		}
		
	} catch (error) {
		console.error('❌ Error during local generation:', error)
		throw error
	}
}

if (require.main === module) {
	generateExperiencesLocal()
		.then(result => {
			console.log('\n✅ Task completed successfully!')
			process.exit(0)
		})
		.catch(error => {
			console.error('\n❌ Task failed:', error)
			process.exit(1)
		})
}

module.exports = { generateExperiencesLocal } 