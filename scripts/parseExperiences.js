const fs = require('fs')
const path = require('path')

/**
 * Split experiences text by separator lines
 * @param {string} text - The full text content
 * @returns {string[]} - Array of individual experience texts
 */
function splitExperiences(text) {
	if (!text || text.trim() === '') {
		return []
	}

	// Split by lines of underscores (separator)
	const experiences = text
		.split(/_{10,}/) // Split by 10 or more underscores
		.map(exp => exp.trim())
		.filter(exp => exp.length > 0 && exp.includes('📌')) // Only keep sections with experience markers

	return experiences
}

/**
 * Extract structured data from a single experience text
 * @param {string} experienceText - Text of a single experience
 * @returns {Object} - Structured experience data
 */
function extractExperienceData(experienceText) {
	const lines = experienceText.split('\n').map(line => line.trim())
	
	// Extract title from the 📌 line
	const titleLine = lines.find(line => line.includes('📌'))
	const title = titleLine 
		? titleLine.replace(/📌\s*\d+\.\s*/, '').trim()
		: 'Unknown Experience'

	// Find section boundaries
	const sections = {
		situation: [],
		actions: [],
		skills: [],
		stats: []
	}

	let currentSection = null
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		
		if (line.toLowerCase().includes('situation:')) {
			currentSection = 'situation'
			continue
		} else if (line.toLowerCase().includes('actions taken:')) {
			currentSection = 'actions'
			continue
		} else if (line.toLowerCase().includes('skills demonstrated:')) {
			currentSection = 'skills'
			continue
		} else if (line.toLowerCase().includes('key statistics') || line.toLowerCase().includes('anecdotes:')) {
			currentSection = 'stats'
			continue
		}

		if (currentSection && line.length > 0) {
			sections[currentSection].push(line)
		}
	}

	// Combine all sections into content
	let content = [
		...sections.situation,
		...sections.actions,
		...sections.skills,
		...sections.stats
	].filter(line => line.length > 0).join(' ')

	// If no structured content found, use the raw text as fallback (excluding title line)
	if (content.length === 0) {
		content = lines
			.filter(line => line.length > 0 && !line.includes('📌'))
			.join(' ')
			.trim()
	}

	// Generate description from situation (first few sentences) or first part of content
	const description = sections.situation.length > 0 
		? sections.situation.join(' ').trim()
		: content.substring(0, 150).trim()

	return {
		title,
		description,
		content
	}
}

/**
 * Parse experiences from text file
 * @param {string} filePath - Path to the text file
 * @returns {Object[]} - Array of parsed experience objects
 */
function parseExperiencesFromText(filePath) {
	const text = fs.readFileSync(filePath, 'utf8')
	const experiences = splitExperiences(text)
	
	return experiences.map(exp => extractExperienceData(exp))
}

module.exports = {
	parseExperiencesFromText,
	splitExperiences,
	extractExperienceData
} 