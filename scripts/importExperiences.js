require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const { parseExperiencesFromText } = require('./parseExperiences')
const { generateTags } = require('./tagGeneration')
const { generateEmbedding } = require('./embeddingGeneration')
const Experience = require('../models/Experience')

/**
 * Determine category and role based on experience content
 * @param {Object} experienceData - Raw experience data
 * @returns {Object} - Category and role information
 */
function categorizeExperience(experienceData) {
	const { title, content } = experienceData
	const titleLower = title.toLowerCase()
	const contentLower = content.toLowerCase()

	// Default
	let category = 'technical-leadership'
	let role = 'senior-engineer'

	// Revenue Growth - AWS Config Pricing Pivot
	if (titleLower.includes('pricing') && titleLower.includes('positioning') && titleLower.includes('pivot')) {
		category = 'revenue-growth'
	}
	// Business Continuity - JWCC Government Contract Turnaround
	else if (titleLower.includes('jwcc') || (titleLower.includes('government') && titleLower.includes('contract') && titleLower.includes('turnaround'))) {
		category = 'business-continuity'
	}
	// Scalability Enablement - Scaling AWS Organizations
	else if (titleLower.includes('scaling') && titleLower.includes('aws organizations')) {
		category = 'scalability-enablement'
	}
	// Customer Success - Challenging Customer Relationship
	else if (titleLower.includes('challenging') && titleLower.includes('customer') && titleLower.includes('relationship')) {
		category = 'customer-success'
	}
	// Operational Efficiency - Automated Reasoning Integration
	else if (titleLower.includes('automated reasoning') || (titleLower.includes('weirwood') && titleLower.includes('integration'))) {
		category = 'operational-efficiency'
	}
	// Platform Stability - Infrastructure and Partnership Reset
	else if (titleLower.includes('infrastructure') && titleLower.includes('partnership') && titleLower.includes('reset')) {
		category = 'platform-stability'
	}
	// Risk Mitigation - Account Lifecycle and Deletion Integrity
	else if (titleLower.includes('account lifecycle') || (titleLower.includes('deletion') && titleLower.includes('integrity'))) {
		category = 'risk-mitigation'
	}
	// Market Expansion - Launching Foundational AWS Services
	else if (titleLower.includes('launching') && titleLower.includes('foundational') && titleLower.includes('services')) {
		category = 'market-expansion'
	}
	// Fallback patterns for partial matches
	else if (contentLower.includes('pricing') || contentLower.includes('churn') || contentLower.includes('revenue')) {
		category = 'revenue-growth'
	}
	else if (contentLower.includes('crisis') || contentLower.includes('failure') || contentLower.includes('contract')) {
		category = 'business-continuity'
	}
	else if (contentLower.includes('scale') || contentLower.includes('scalability') || contentLower.includes('unprecedented scale')) {
		category = 'scalability-enablement'
	}
	else if (contentLower.includes('customer') && (contentLower.includes('trust') || contentLower.includes('escalated'))) {
		category = 'customer-success'
	}
	else if (contentLower.includes('automated') || contentLower.includes('efficiency') || contentLower.includes('faster')) {
		category = 'operational-efficiency'
	}
	else if (contentLower.includes('stability') || contentLower.includes('incidents') || contentLower.includes('technical debt')) {
		category = 'platform-stability'
	}
	else if (contentLower.includes('compliance') || contentLower.includes('governance') || contentLower.includes('data deletion')) {
		category = 'risk-mitigation'
	}
	else if (contentLower.includes('launch') || contentLower.includes('foundational') || contentLower.includes('new service')) {
		category = 'market-expansion'
	}

	return { category, role }
}

/**
 * Process a single experience by adding tags and embeddings
 * @param {Object} experienceData - Raw experience data from parsing
 * @returns {Promise<Object>} - Processed experience ready for database
 */
async function processExperience(experienceData) {
	console.log(`Processing experience: ${experienceData.title}`)

	try {
		// Generate tags using AI
		const tags = await generateTags(experienceData.content)
		
		// Generate embedding for the full content
		const embedding = await generateEmbedding(experienceData.content)

		// Determine category and role dynamically
		const { category, role } = categorizeExperience(experienceData)

		// Create the final experience object matching the schema
		const processedExperience = {
			title: experienceData.title,
			content: experienceData.content,
			embedding: embedding,
			metadata: {
				tags: tags,
				date: new Date(),
				category: category,
				role: role
			}
		}

		return processedExperience

	} catch (error) {
		console.error(`Error processing experience "${experienceData.title}":`, error)
		throw error
	}
}

/**
 * Import all experiences from text file to MongoDB
 * @param {string} filePath - Path to the experiences text file
 * @returns {Promise<Object>} - Import results with counts
 */
async function importExperiences(filePath) {
	// Check if file exists
	if (!fs.existsSync(filePath)) {
		throw new Error(`File not found: ${filePath}`)
	}

	console.log(`Starting import from: ${filePath}`)

	// Connect to MongoDB
	await mongoose.connect(process.env.MONGODB_URI)
	console.log('Connected to MongoDB')

	try {
		// Parse experiences from text file
		console.log('Parsing experiences from text file...')
		const rawExperiences = parseExperiencesFromText(filePath)
		console.log(`Found ${rawExperiences.length} experiences to process`)

		if (rawExperiences.length === 0) {
			throw new Error('No experiences found in the text file')
		}

		// Clear existing experiences
		console.log('Clearing existing experiences...')
		const deleteResult = await Experience.deleteMany({})
		console.log(`Deleted ${deleteResult.deletedCount} existing experiences`)

		// Process each experience
		const processedExperiences = []
		let errorCount = 0

		for (let i = 0; i < rawExperiences.length; i++) {
			try {
				const processed = await processExperience(rawExperiences[i])
				processedExperiences.push(processed)
				console.log(`✓ Processed ${i + 1}/${rawExperiences.length}: ${processed.title}`)
			} catch (error) {
				console.error(`✗ Failed to process experience ${i + 1}:`, error)
				errorCount++
			}
		}

		// Insert processed experiences into database
		if (processedExperiences.length > 0) {
			console.log(`Inserting ${processedExperiences.length} experiences into database...`)
			await Experience.create(processedExperiences)
			console.log('✓ All experiences inserted successfully')

			// Save to JSON file for backup
			const jsonFilePath = path.join(__dirname, '../data/experiences.json')
			fs.writeFileSync(jsonFilePath, JSON.stringify(processedExperiences, null, 2))
			console.log(`✓ Experiences saved to ${jsonFilePath}`)
		}

		const result = {
			imported: processedExperiences.length,
			errors: errorCount,
			total: rawExperiences.length
		}

		console.log('\n=== Import Complete ===')
		console.log(`Successfully imported: ${result.imported}`)
		console.log(`Errors: ${result.errors}`)
		console.log(`Total processed: ${result.total}`)

		return result

	} finally {
		// Close MongoDB connection
		await mongoose.connection.close()
		console.log('MongoDB connection closed')
	}
}

// CLI execution
if (require.main === module) {
	const filePath = process.argv[2] || path.join(__dirname, '../data/Caitlyn Shim Project Summaries.txt')
	
	importExperiences(filePath)
		.then(result => {
			console.log('\n✓ Import completed successfully!')
			process.exit(0)
		})
		.catch(error => {
			console.error('\n✗ Import failed:', error)
			process.exit(1)
		})
}

module.exports = {
	importExperiences,
	processExperience
} 