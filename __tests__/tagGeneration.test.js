const { generateTags } = require('../scripts/tagGeneration')

describe('Tag Generation', () => {
	test('should generate relevant tags from experience content', async () => {
		const content = `When I took leadership of AWS Config, the prevailing internal narrative was that customer churn was due to pricing. I initiated a deep usage-data study across customer segments. We examined churned and retained customer behaviors by analyzing service usage telemetry. My team reached out directly to key churned customers. We explicitly tested the hypothesis by offering deeply discounted pricing up to 50% off to assess price sensitivity. Discovered through structured interviews that churned customers primarily sought specific inventory management features or capabilities from competitive services like Wiz, rather than lower costs. After repositioning messaging around governance/audit rather than cost, we halted churn almost immediately and regained several key customers.`
		
		const tags = await generateTags(content)
		
		expect(Array.isArray(tags)).toBe(true)
		expect(tags.length).toBeGreaterThan(0)
		expect(tags.length).toBeLessThanOrEqual(8) // Reasonable number of tags
		
		// Should contain relevant concepts
		const tagString = tags.join(' ').toLowerCase()
		expect(tagString).toMatch(/customer|leadership|strategy|analysis|churn/)
	}, 10000) // Longer timeout for AI call

	test('should handle empty content gracefully', async () => {
		const tags = await generateTags('')
		expect(Array.isArray(tags)).toBe(true)
		expect(tags.length).toBe(0)
	})

	test('should handle short content', async () => {
		const content = 'Brief project description.'
		const tags = await generateTags(content)
		
		expect(Array.isArray(tags)).toBe(true)
		expect(tags.length).toBeGreaterThanOrEqual(0)
	})
}) 