import { MongoClient } from 'mongodb';

function getClientPromise() {
  if (global._mongoClientPromise) {
    return global._mongoClientPromise;
  }
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error('MONGODB_URI não definida. Configure em Environment Variables.');
  }
  const client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
  return global._mongoClientPromise;
}

export default getClientPromise();

export async function getDb() {
  const client = await getClientPromise();
  return client.db('thirus_xp');
}

// Collections:
// - players: { name, rank, level, experience, vocation, guild, online, lastSeen, updatedAt }
// - history: { name, level, experience, timestamp }
// - snapshots: { timestamp, onlineCount, trackedCount, players: [...] }
// - state: { _id: 'latest', lastUpdate, previousXP: { playerName: xp, ... } }
