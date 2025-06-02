const { generateAnswer } = require('../lib/openai');

describe('generateAnswer', () => {
  it('formats answer in markdown and cites context', async () => {
    const question = 'Describe a time you led a team through a challenge.';
    const context = '(1) I led a team at Acme Corp through a major migration project.\n(2) I managed a cross-functional group to deliver a product under a tight deadline.';
    const answer = await generateAnswer({ question, context });
    expect(answer).toMatch(/\[1\]/);
    expect(answer).toMatch(/\*|\*/); // markdown formatting
    expect(answer.toLowerCase()).not.toContain('as an ai language model');
  });

  it('says context is insufficient if context is empty', async () => {
    const question = 'Describe a time you led a team through a challenge.';
    const context = '';
    const answer = await generateAnswer({ question, context });
    expect(answer.toLowerCase()).toContain('insufficient');
  });
}); 