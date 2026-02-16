export default async function handler(req, res) {
  const info = {
    hasMongoUri: !!process.env.MONGODB_URI,
    uriLength: (process.env.MONGODB_URI || '').length,
    uriTrimmedLength: (process.env.MONGODB_URI || '').trim().length,
    uriStart: (process.env.MONGODB_URI || '').substring(0, 20),
    nodeVersion: process.version,
  };

  try {
    const { getDb } = await import('../../lib/mongodb');
    const db = await getDb();
    const collections = await db.listCollections().toArray();
    info.dbConnected = true;
    info.collections = collections.map(c => c.name);
  } catch (err) {
    info.dbConnected = false;
    info.dbError = err.message;
  }

  res.status(200).json(info);
}
