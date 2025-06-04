const fs = require('fs')
const path = require('path')

// Just test the processExperience function without the full import
const { processExperience } = require('../scripts/importExperiences')

describe('Import Experiences', () => {
	describe('categorizeExperience', () => {
		// We need to access the categorizeExperience function for testing
		// Let's create a simple test by checking the results of processExperience
		test('should categorize leadership experiences correctly', async () => {
			const experienceData = {
				title: 'Team Leadership and Stakeholder Management',
				content: 'I inherited a team and led cross-team collaboration efforts, managing stakeholders across multiple organizations.'
			}

			const processed = await processExperience(experienceData)
			expect(processed.metadata.category).toBe('leadership-experience')
			expect(processed.metadata.role).toBe('engineering-manager')
		}, 10000)

		test('should categorize crisis management experiences correctly', async () => {
			const experienceData = {
				title: 'Critical System Turnaround',
				content: 'A major system was failing and customers escalated severe issues, requiring high-pressure problem solving and risk management.'
			}

			const processed = await processExperience(experienceData)
			expect(processed.metadata.category).toBe('crisis-management')
			expect(processed.metadata.role).toBe('senior-engineer')
		}, 10000)

		test('should categorize customer relations experiences correctly', async () => {
			const experienceData = {
				title: 'Challenging Customer Relationship Resolution',
				content: 'Major enterprise customer escalated frustrations, requiring trust building and stakeholder relationship management.'
			}

			const processed = await processExperience(experienceData)
			expect(processed.metadata.category).toBe('customer-relations')
			expect(processed.metadata.role).toBe('senior-engineer')
		}, 10000)

		test('should categorize technical innovation experiences correctly', async () => {
			const experienceData = {
				title: 'Infrastructure Scaling and Automation Integration',
				content: 'Implemented technical architecture improvements with automated reasoning and scalability enhancements.'
			}

			const processed = await processExperience(experienceData)
			expect(processed.metadata.category).toBe('technical-innovation')
			expect(processed.metadata.role).toBe('senior-engineer')
		}, 10000)

		test('should categorize strategic initiatives correctly', async () => {
			const experienceData = {
				title: 'Pricing Strategy and Positioning Pivot',
				content: 'Led strategic business analysis of pricing models and revenue optimization, repositioning the product in the market.'
			}

			const processed = await processExperience(experienceData)
			expect(processed.metadata.category).toBe('strategic-initiative')
			expect(processed.metadata.role).toBe('senior-engineer')
		}, 10000)
	})

	describe('processExperience', () => {
		test('should process experience with all required fields', async () => {
			const experienceData = {
				title: 'AWS Config – Pricing and Positioning Pivot',
				description: 'When I took leadership of AWS Config, the team was focused on pricing.',
				content: 'Full experience content with situation, actions, skills, and stats.'
			}

			const processed = await processExperience(experienceData)

			expect(processed.title).toBe(experienceData.title)
			expect(processed.content).toBe(experienceData.content)
			expect(processed).toHaveProperty('metadata')
			expect(Array.isArray(processed.metadata.tags)).toBe(true)
			expect(processed.metadata.tags.length).toBeGreaterThan(0)
			expect(Array.isArray(processed.embedding)).toBe(true)
			expect(processed.embedding.length).toBe(1536)
			expect(processed.metadata.category).toBe('strategic-initiative')
			expect(processed.metadata.role).toBe('senior-engineer')
		}, 10000)

		test('should handle processing multiple experiences', async () => {
			const experiences = [
				{
					title: 'Experience 1',
					content: 'Content 1 with leadership and technical skills'
				},
				{
					title: 'Experience 2', 
					content: 'Content 2 with strategic thinking and problem solving'
				}
			]

			const processed = await Promise.all(
				experiences.map(exp => processExperience(exp))
			)

			expect(processed).toHaveLength(2)
			expect(processed[0].title).toBe('Experience 1')
			expect(processed[1].title).toBe('Experience 2')
			
			// Each should have different embeddings based on content
			expect(processed[0].embedding).not.toEqual(processed[1].embedding)
		}, 15000)
	})
}) 