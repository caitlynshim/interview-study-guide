require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')
const Experience = require('../models/Experience')

async function verifyExperiences() {
	console.log('🔍 Verifying experiences in MongoDB...\n')

	try {
		// Connect to MongoDB
		await mongoose.connect(process.env.MONGODB_URI)
		console.log('✅ Connected to MongoDB\n')

		// Count total experiences
		const count = await Experience.countDocuments()
		console.log(`📊 Total experiences in database: ${count}\n`)

		if (count === 0) {
			console.log('❌ No experiences found in database')
			return
		}

		// Get all experiences (just titles and metadata)
		const experiences = await Experience.find({})
			.select('title metadata.tags metadata.category createdAt')
			.sort({ createdAt: -1 })

		console.log('📋 Experiences in database:')
		console.log('━'.repeat(80))
		
		experiences.forEach((exp, index) => {
			console.log(`${index + 1}. ${exp.title}`)
			console.log(`   Tags: ${exp.metadata?.tags?.join(', ') || 'None'}`)
			console.log(`   Category: ${exp.metadata?.category || 'None'}`)
			console.log(`   Created: ${exp.createdAt?.toISOString() || 'Unknown'}`)
			console.log('')
		})

		console.log('━'.repeat(80))
		console.log(`✅ Verification complete - ${count} experiences found`)

	} catch (error) {
		console.error('❌ Verification failed:', error.message)
	} finally {
		await mongoose.connection.close()
		console.log('🔒 MongoDB connection closed')
	}
}

if (require.main === module) {
	verifyExperiences()
}

module.exports = { verifyExperiences } 