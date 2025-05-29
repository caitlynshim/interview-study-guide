const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkClusterInfo() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const adminDb = client.db().admin();
    
    // Get build info which includes version
    const buildInfo = await adminDb.buildInfo();
    console.log('\nMongoDB Version:', buildInfo.version);

    // Get server status which includes additional cluster info
    const serverStatus = await adminDb.serverStatus();
    console.log('\nCluster Info:');
    console.log('Host:', serverStatus.host);
    console.log('Process Type:', serverStatus.process);
    console.log('Connection Info:', serverStatus.connections);

  } catch (error) {
    console.error('Error checking cluster info:', error);
  } finally {
    await client.close();
  }
}

checkClusterInfo(); 