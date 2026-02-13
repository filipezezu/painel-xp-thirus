import { getDb } from '../../lib/mongodb';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const filter = req.query.filter || 'all';
    const state = await db.collection('state').findOne({ _id: 'latest' });
    
    if (!state || !state.players) {
      return res.json({ lastUpdate: null, players: [] });
    }
    
    let players = state.players;
    
    if (filter === 'online') {
      players = players.filter(p => p.online);
    } else if (filter === 'offline') {
      players = players.filter(p => !p.online);
    }
    
    res.json({
      lastUpdate: state.lastUpdate,
      players
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
