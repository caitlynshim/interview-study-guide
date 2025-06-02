import dbConnect from '../../../lib/dbConnect';
import Experience from '../../../models/Experience';

export default async function handler(req, res) {
  let filter;
  try {
    await dbConnect();
  } catch (err) {
    console.error('[API /api/experiences/list] dbConnect failed:', err, err.stack);
    return res.status(500).json({ message: 'Database connection failed', error: err.message, stack: err.stack });
  }
  try {
    const { category } = req.query;
    filter = category && category !== 'All' ? { 'metadata.category': category } : {};
    console.log('[API /api/experiences/list] filter:', filter);
    const experiences = await Experience.find(filter).sort({ title: 1 });
    const mapped = experiences.map(exp => ({
      _id: exp._id,
      title: exp.title,
      content: exp.content,
      category: exp.metadata?.category || '',
      metadata: exp.metadata || {},
      createdAt: exp.createdAt,
      updatedAt: exp.updatedAt,
    }));
    res.status(200).json({ experiences: mapped });
  } catch (err) {
    console.error('[API /api/experiences/list] Error with filter:', filter);
    console.error('[API /api/experiences/list] Error object:', err);
    console.error('[API /api/experiences/list] Error stack:', err.stack);
    res.status(500).json({ message: 'Error fetching experiences', error: err.message, stack: err.stack });
  }
} 