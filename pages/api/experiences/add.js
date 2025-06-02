import dbConnect from '../../../lib/dbConnect';
import Experience from '../../../models/Experience';

function validate(fields) {
  const errors = {};
  if (!fields.title || !fields.title.trim()) errors.title = 'Title is required.';
  if (!fields.content || !fields.content.trim()) errors.content = 'Content is required.';
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  await dbConnect();
  const { title, content, tags, category, role, date } = req.body;
  const errors = validate({ title, content });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  try {
    // Generate category if not provided
    let finalCategory = category;
    if (!finalCategory) {
      try {
        const { generateCategory } = await import('../../../lib/openai');
        finalCategory = await generateCategory({ title, content });
      } catch (catErr) {
        console.error('[API /api/experiences/add] Category generation error:', catErr, catErr.stack);
        finalCategory = '';
      }
    }
    // Prepare experience doc
    const exp = new Experience({
      title,
      content,
      embedding: [0], // Placeholder, will be updated after embedding
      metadata: {
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        category: finalCategory,
        role,
        date: date ? new Date(date) : undefined,
      },
    });
    await exp.save();
    // Generate embedding and update experience
    try {
      const { generateEmbedding } = await import('../../../lib/openai');
      const embedding = await generateEmbedding(`${title}\n${content}`);
      exp.embedding = embedding;
      await exp.save();
    } catch (embedErr) {
      console.error('[API /api/experiences/add] Embedding error:', embedErr, embedErr.stack);
      return res.status(500).json({ message: 'Failed to embed experience', error: embedErr.message, stack: embedErr.stack });
    }
    res.status(201).json({ message: 'Experience added', experience: exp });
  } catch (err) {
    console.error('[API /api/experiences/add] Error:', err, err.stack);
    res.status(500).json({ message: 'Failed to add experience', error: err.message, stack: err.stack });
  }
}

// TEST: Validation logic
if (typeof describe === 'function') {
  describe('validate', () => {
    it('requires title and content', () => {
      expect(Object.keys(validate({ title: '', content: '' }))).toContain('title');
      expect(Object.keys(validate({ title: '', content: '' }))).toContain('content');
      expect(Object.keys(validate({ title: 'foo', content: '' }))).toContain('content');
      expect(Object.keys(validate({ title: '', content: 'bar' }))).toContain('title');
      expect(Object.keys(validate({ title: 'foo', content: 'bar' }))).toHaveLength(0);
    });
  });
}

// TEST: Embedding logic
if (typeof describe === 'function') {
  const mockEmbedding = [0.1, 0.2, 0.3];
  jest.mock('../../../lib/openai', () => ({
    generateEmbedding: jest.fn().mockResolvedValue(mockEmbedding),
  }));
  describe('add experience embedding', () => {
    it('should call generateEmbedding and update embedding', async () => {
      const req = { method: 'POST', body: { title: 'Test', content: 'Test content' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json.mock.calls[0][0].experience.embedding).toEqual(mockEmbedding);
    });
  });
} 