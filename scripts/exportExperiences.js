require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')
const Experience = require('../models/Experience')

async function exportExperiences() {
	console.log('🔍 Exporting experiences collection to backup file...\n')

	try {
		// Connect to MongoDB (read-only)
		await mongoose.connect(process.env.MONGODB_URI)
		console.log('✅ Connected to MongoDB\n')

		// Read all experiences from collection (READ ONLY)
		console.log('📖 Reading experiences from collection...')
		const experiences = await Experience.find({}).lean() // .lean() for better performance, returns plain objects
		
		console.log(`✓ Found ${experiences.length} experiences to export\n`)

		if (experiences.length === 0) {
			console.log('❌ No experiences found in collection')
			return
		}

		// Create backup file path
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const backupFileName = `experiences-backup-${timestamp}.json`
		const backupPath = path.join(__dirname, '../data', backupFileName)

		// Write to JSON file
		console.log(`💾 Writing backup to: ${backupFileName}`)
		fs.writeFileSync(backupPath, JSON.stringify(experiences, null, 2))
		
		const fileStats = fs.statSync(backupPath)
		console.log(`✅ Backup completed successfully!`)
		console.log(`📁 File: ${backupPath}`)
		console.log(`📊 Size: ${(fileStats.size / 1024).toFixed(2)} KB`)
		console.log(`📋 Documents: ${experiences.length}`)

		// Show sample of what was exported (just structure, not full content)
		console.log('\n📋 Sample export structure:')
		if (experiences[0]) {
			const sample = {
				title: experiences[0].title,
				content: `${experiences[0].content.substring(0, 50)}...`,
				metadata: experiences[0].metadata,
				embedding: `[${experiences[0].embedding?.length || 0} dimensions]`,
				createdAt: experiences[0].createdAt,
				_id: experiences[0]._id
			}
			console.log(JSON.stringify(sample, null, 2))
		}

	} catch (error) {
		console.error('❌ Export failed:', error.message)
		throw error
	} finally {
		// Always close connection
		await mongoose.connection.close()
		console.log('\n🔒 MongoDB connection closed')
	}
}

if (require.main === module) {
	exportExperiences()
		.then(() => {
			console.log('\n✅ Export completed successfully!')
			process.exit(0)
		})
		.catch(error => {
			console.error('\n❌ Export failed:', error)
			process.exit(1)
		})
}

module.exports = { exportExperiences } 