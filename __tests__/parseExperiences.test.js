const fs = require('fs')
const path = require('path')
const { parseExperiencesFromText, splitExperiences, extractExperienceData } = require('../scripts/parseExperiences')

describe('Experience Parsing', () => {
	const sampleText = `Here's your complete summary:
________________

📌 1. AWS Config – Pricing and Positioning Pivot
Situation:
When I took leadership of AWS Config, the prevailing internal narrative was that customer churn was due to pricing.

Actions Taken:
* Detailed Customer Segmentation Analysis: I initiated a deep usage-data study
* Customer Interviews & Price Testing: My team reached out directly to key churned customers

Skills Demonstrated:
* Analytical depth and rigor
* Customer-centric research
* Strategic decision-making backed by evidence

Key Statistics & Anecdotes:
* After repositioning messaging around governance/audit rather than cost, we halted churn almost immediately
________________

📌 2. JWCC Government Contract Turnaround
Situation:
AWS discovered very late that a high-visibility JWCC contract bid faced failure.

Actions Taken:
* Rapid Technical Re-architecting: Quickly engaged with the third-party vendor
* Strategic Negotiation: Reduced original cost by negotiating a new contract

Skills Demonstrated:
* High-pressure negotiation skills
* Crisis and risk management

Key Statistics & Anecdotes:
* Won the JWCC contract, avoiding reputational damage from public failure
________________`

	describe('splitExperiences', () => {
		test('should split text by underscore separators', () => {
			const experiences = splitExperiences(sampleText)
			
			expect(experiences).toHaveLength(2)
			expect(experiences[0]).toContain('AWS Config – Pricing and Positioning Pivot')
			expect(experiences[1]).toContain('JWCC Government Contract Turnaround')
		})

		test('should handle empty input', () => {
			const experiences = splitExperiences('')
			expect(experiences).toHaveLength(0)
		})
	})

	describe('extractExperienceData', () => {
		test('should extract title from experience text', () => {
			const experienceText = `📌 1. AWS Config – Pricing and Positioning Pivot
Situation:
When I took leadership of AWS Config...`
			
			const data = extractExperienceData(experienceText)
			expect(data.title).toBe('AWS Config – Pricing and Positioning Pivot')
		})

		test('should extract and combine content sections', () => {
			const experienceText = `📌 1. AWS Config – Pricing and Positioning Pivot
Situation:
When I took leadership of AWS Config, the prevailing internal narrative was that customer churn was due to pricing.

Actions Taken:
* Detailed Customer Segmentation Analysis: I initiated a deep usage-data study

Skills Demonstrated:
* Analytical depth and rigor

Key Statistics & Anecdotes:
* After repositioning messaging around governance/audit rather than cost, we halted churn`
			
			const data = extractExperienceData(experienceText)
			expect(data.content).toContain('When I took leadership of AWS Config')
			expect(data.content).toContain('Detailed Customer Segmentation Analysis')
			expect(data.content).toContain('Analytical depth and rigor')
			expect(data.content).toContain('halted churn')
		})

		test('should generate description from situation', () => {
			const experienceText = `📌 1. AWS Config – Pricing and Positioning Pivot
Situation:
When I took leadership of AWS Config, the prevailing internal narrative was that customer churn was due to pricing.`
			
			const data = extractExperienceData(experienceText)
			expect(data.description).toBe('When I took leadership of AWS Config, the prevailing internal narrative was that customer churn was due to pricing.')
		})
	})
}) 