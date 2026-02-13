import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Defina a variável MONGODB_URI no .env.local');
}

let cached = global._mongoClientPromise;

if (!cached) {
  const client = new MongoClient(MONGODB_URI);
  cached = global._mongoClientPromise = client.connect();
}

export default cached;

export async function getDb() {
  const client = await cached;
  return client.db('thirus_xp');
}

// Collections:
// - players: { name, rank, level, experience, vocation, guild, online, lastSeen, updatedAt }
// - history: { name, level, experience, timestamp }
// - snapshots: { timestamp, onlineCount, trackedCount, players: [...] }
// - state: { _id: 'latest', lastUpdate, previousXP: { playerName: xp, ... } }
