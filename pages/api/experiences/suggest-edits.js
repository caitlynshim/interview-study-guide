const { openai } = require('../../../lib/openai');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { original, newText } = req.body;
  if (!original || !newText) {
    return res.status(400).json({ message: 'Missing original or newText in body' });
  }
  try {
    // Suggest improved version
    const improvePrompt = `You are an expert at merging and improving interview experiences. Given the existing experience and the new answer, suggest an improved version that combines the best details, adds missing metrics, and ensures specificity, 'I' language, and business impact. Format as markdown.\n\nExisting Experience:\n${original}\n\nNew Answer:\n${newText}\n\nImproved Experience:`;
    const improveResp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert at merging and improving interview experiences.' },
        { role: 'user', content: improvePrompt },
      ],
      temperature: 0.2,
    });
    const suggested = improveResp.choices[0].message.content.trim();
    // Generate a markdown diff
    const diffPrompt = `Compare the following two interview experiences and output a markdown-formatted diff, highlighting what was added, removed, or changed.\n\nOriginal:\n${original}\n\nNew:\n${newText}\n\nMarkdown Diff:`;
    const diffResp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a markdown diff generator.' },
        { role: 'user', content: diffPrompt },
      ],
      temperature: 0.1,
    });
    const diff = diffResp.choices[0].message.content.trim();
    res.status(200).json({ suggested, diff });
  } catch (error) {
    console.error('[suggest-edits] Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}

export default handler; 