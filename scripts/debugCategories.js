require('dotenv').config({ path: '.env.local' })
const { parseExperiencesFromText } = require('./parseExperiences')
const path = require('path')

/**
 * Debug version of categorizeExperience with detailed logging
 */
function debugCategorizeExperience(experienceData) {
	const { title, content } = experienceData
	const titleLower = title.toLowerCase()
	const contentLower = content.toLowerCase()

	console.log(`\n🔍 Analyzing: "${title}"`)
	console.log(`Title (lowercase): "${titleLower}"`)
	console.log(`Content preview: "${contentLower.substring(0, 100)}..."`)

	// Default
	let category = 'technical-leadership'
	let role = 'senior-engineer'
	let matches = []

	// Check each category pattern
	if (titleLower.includes('pricing') || 
		titleLower.includes('positioning') ||
		titleLower.includes('pivot') ||
		contentLower.includes('pricing') ||
		contentLower.includes('revenue') ||
		contentLower.includes('market') ||
		contentLower.includes('churn')) {
		category = 'business-strategy'
		matches.push('business-strategy: pricing/positioning/pivot/revenue/market/churn')
	}

	if (titleLower.includes('contract') ||
		titleLower.includes('turnaround') ||
		titleLower.includes('government') ||
		contentLower.includes('negotiation') ||
		contentLower.includes('crisis') ||
		contentLower.includes('failure') ||
		contentLower.includes('contract')) {
		category = 'crisis-resolution'
		matches.push('crisis-resolution: contract/turnaround/government/negotiation/crisis/failure')
	}

	if (titleLower.includes('scaling') ||
		titleLower.includes('organizations') ||
		contentLower.includes('scale') ||
		contentLower.includes('scalability') ||
		contentLower.includes('architecture') ||
		contentLower.includes('unprecedented scale')) {
		category = 'system-architecture'
		matches.push('system-architecture: scaling/organizations/scale/scalability/architecture')
	}

	if (titleLower.includes('customer') ||
		titleLower.includes('relationship') ||
		contentLower.includes('customer') ||
		contentLower.includes('stakeholder relationship') ||
		contentLower.includes('enterprise customer') ||
		contentLower.includes('trust building')) {
		category = 'stakeholder-management'
		matches.push('stakeholder-management: customer/relationship/stakeholder/trust building')
	}

	if (titleLower.includes('automated') ||
		titleLower.includes('integration') ||
		titleLower.includes('weirwood') ||
		contentLower.includes('automated reasoning') ||
		contentLower.includes('integration') ||
		contentLower.includes('automation')) {
		category = 'technical-integration'
		matches.push('technical-integration: automated/integration/weirwood/automated reasoning/automation')
	}

	if (titleLower.includes('infrastructure') ||
		titleLower.includes('partnership') ||
		titleLower.includes('reset') ||
		contentLower.includes('technical debt') ||
		contentLower.includes('infrastructure') ||
		contentLower.includes('partner teams')) {
		category = 'infrastructure-leadership'
		matches.push('infrastructure-leadership: infrastructure/partnership/reset/technical debt/partner teams')
	}

	if (titleLower.includes('lifecycle') ||
		titleLower.includes('deletion') ||
		titleLower.includes('integrity') ||
		contentLower.includes('compliance') ||
		contentLower.includes('governance') ||
		contentLower.includes('data deletion')) {
		category = 'compliance-governance'
		matches.push('compliance-governance: lifecycle/deletion/integrity/compliance/governance/data deletion')
	}

	if (titleLower.includes('launching') ||
		titleLower.includes('foundational') ||
		contentLower.includes('launch') ||
		contentLower.includes('foundational') ||
		contentLower.includes('aws organizations') ||
		contentLower.includes('cloudwatch')) {
		category = 'service-delivery'
		matches.push('service-delivery: launching/foundational/launch/aws organizations/cloudwatch')
	}

	console.log(`📋 Matched patterns: ${matches.length > 0 ? matches.join('; ') : 'None (using default)'}`)
	console.log(`✅ Final category: ${category}`)

	return { category, role }
}

async function debugCategories() {
	console.log('🔍 Debugging experience categorization...\n')

	const filePath = path.join(__dirname, '../data/Caitlyn Shim Project Summaries.txt')
	
	try {
		// Parse experiences
		const rawExperiences = parseExperiencesFromText(filePath)
		console.log(`📊 Found ${rawExperiences.length} experiences\n`)

		// Debug each experience categorization
		rawExperiences.forEach((exp, index) => {
			console.log(`\n${'='.repeat(80)}`)
			console.log(`Experience ${index + 1}`)
			debugCategorizeExperience(exp)
		})

		console.log(`\n${'='.repeat(80)}`)
		console.log('🎉 Debug complete!')

	} catch (error) {
		console.error('❌ Debug failed:', error)
	}
}

if (require.main === module) {
	debugCategories()
}

module.exports = { debugCategories } 