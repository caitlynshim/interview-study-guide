import dbConnect from '../../../lib/dbConnect';
import Experience from '../../../models/Experience';
import { generateEmbedding } from '../../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { id } = req.query;
  const { title, content, metadata } = req.body;
  if (!id || !title || !content) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    await dbConnect();
    // Generate category if not provided
    let finalCategory = metadata?.category;
    if (!finalCategory) {
      try {
        const { generateCategory } = await import('../../../lib/openai');
        finalCategory = await generateCategory({ title, content });
      } catch (catErr) {
        console.error('[API /api/experiences/edit] Category generation error:', catErr, catErr.stack);
        finalCategory = '';
      }
    }
    // Re-embed
    let embedding;
    try {
      embedding = await generateEmbedding(`${title}\n${content}`);
    } catch (embedErr) {
      return res.status(500).json({ message: 'Failed to re-embed experience', error: embedErr.message, stack: embedErr.stack });
    }
    const updated = await Experience.findByIdAndUpdate(
      id,
      {
        title,
        content,
        metadata: { ...metadata, category: finalCategory },
        embedding,
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Experience not found' });
    }
    return res.status(200).json({ message: 'Experience updated', experience: updated });
  } catch (err) {
    console.error('[API /api/experiences/edit] Error:', err, err.stack);
    return res.status(500).json({ message: 'Failed to update experience', error: err.message, stack: err.stack });
  }
}

// TEST: Edit handler
if (typeof describe === 'function') {
  describe('PUT /api/experiences/edit', () => {
    it('returns 400 if missing fields', async () => {
      const req = { method: 'PUT', query: {}, body: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
} 