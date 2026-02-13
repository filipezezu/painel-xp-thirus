import { getDb } from '../../lib/mongodb';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const state = await db.collection('state').findOne({ _id: 'latest' });
    
    if (!state) {
      return res.json({
        lastUpdate: null,
        onlineCount: 0,
        trackedCount: 0,
        totalRanked: 0
      });
    }
    
    res.json({
      lastUpdate: state.lastUpdate,
      onlineCount: state.onlineCount || 0,
      trackedCount: state.trackedCount || 0,
      totalRanked: state.totalRanked || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
