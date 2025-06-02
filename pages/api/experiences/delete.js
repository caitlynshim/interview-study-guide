import dbConnect from '../../../lib/dbConnect';
import Experience from '../../../models/Experience';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'Missing experience id' });
  }
  try {
    await dbConnect();
    const deleted = await Experience.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Experience not found' });
    }
    return res.status(200).json({ message: 'Experience deleted', id });
  } catch (err) {
    console.error('[API /api/experiences/delete] Error:', err, err.stack);
    return res.status(500).json({ message: 'Failed to delete experience', error: err.message, stack: err.stack });
  }
}

// TEST: Delete handler
if (typeof describe === 'function') {
  describe('DELETE /api/experiences/delete', () => {
    it('returns 400 if no id', async () => {
      const req = { method: 'DELETE', query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
} 