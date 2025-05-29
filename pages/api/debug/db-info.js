import dbConnect from '../../../lib/mongodb';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const dbName = mongoose.connection.db.databaseName;
    const collections = await mongoose.connection.db.collections();
    const collectionNames = collections.map(c => c.collectionName);
    
    res.status(200).json({
      databaseName: dbName,
      collections: collectionNames
    });
  } catch (error) {
    console.error('Error getting DB info:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 