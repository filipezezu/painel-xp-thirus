import { getDb } from '../../lib/mongodb';

export default async function handler(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const db = await getDb();
    
    const snapshots = await db.collection('snapshots')
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    res.json({
      snapshots: snapshots.reverse().map(s => ({
        timestamp: s.timestamp,
        onlineCount: s.onlineCount,
        trackedCount: s.trackedCount,
        players: s.players
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
