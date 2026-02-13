import { getDb } from '../../../lib/mongodb';

export default async function handler(req, res) {
  try {
    const { name } = req.query;
    const db = await getDb();
    
    const records = await db.collection('history')
      .find({ name })
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray();
    
    if (records.length === 0) {
      return res.json({ records: [], firstSeen: null });
    }
    
    res.json({
      records: records.map(r => ({
        level: r.level,
        experience: r.experience,
        xpDiff: r.xpDiff || 0,
        levelDiff: r.levelDiff || 0,
        timestamp: r.timestamp
      })),
      firstSeen: records[records.length - 1].timestamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
