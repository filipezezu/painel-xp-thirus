import { getDb } from '../../lib/mongodb';
import { fetchHighscores, fetchOnlinePlayers } from '../../lib/scraper';

export default async function handler(req, res) {
  // Proteger endpoint - só cron da Vercel ou request com secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Em dev local, permitir sem auth
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const db = await getDb();
    const now = Date.now();
    
    // Buscar dados em paralelo
    const [highscores, onlinePlayers] = await Promise.all([
      fetchHighscores(),
      fetchOnlinePlayers()
    ]);
    
    const onlineNames = new Set(onlinePlayers.map(p => p.name));
    const rankedMap = new Map(highscores.map(p => [p.name, p]));
    
    // Buscar estado anterior (XP anterior)
    const stateDoc = await db.collection('state').findOne({ _id: 'latest' });
    const previousXP = stateDoc?.previousXP || {};
    
    // Montar lista de jogadores rastreados
    const tracked = [];
    const historyBulk = [];
    
    for (const online of onlinePlayers) {
      const ranked = rankedMap.get(online.name);
      if (ranked) {
        const prevExp = previousXP[online.name]?.experience;
        const prevLevel = previousXP[online.name]?.level;
        const xpDiff = prevExp !== undefined ? ranked.experience - prevExp : 0;
        const levelDiff = prevLevel !== undefined ? ranked.level - prevLevel : 0;
        
        tracked.push({
          rank: ranked.rank,
          name: ranked.name,
          level: ranked.level,
          experience: ranked.experience,
          vocation: ranked.vocation,
          guild: online.guild || '',
          xpDiff,
          levelDiff,
          online: true
        });
        
        // Registrar no histórico se houve mudança
        if (prevExp === undefined || prevExp !== ranked.experience || prevLevel !== ranked.level) {
          historyBulk.push({
            insertOne: {
              document: {
                name: ranked.name,
                level: ranked.level,
                experience: ranked.experience,
                xpDiff,
                levelDiff,
                timestamp: now
              }
            }
          });
        }
      }
    }
    
    // Adicionar offline do ranking
    for (const ranked of highscores) {
      if (!onlineNames.has(ranked.name)) {
        const prevExp = previousXP[ranked.name]?.experience;
        const prevLevel = previousXP[ranked.name]?.level;
        const xpDiff = prevExp !== undefined ? ranked.experience - prevExp : 0;
        const levelDiff = prevLevel !== undefined ? ranked.level - prevLevel : 0;
        
        tracked.push({
          rank: ranked.rank,
          name: ranked.name,
          level: ranked.level,
          experience: ranked.experience,
          vocation: ranked.vocation,
          guild: '',
          xpDiff,
          levelDiff,
          online: false
        });
      }
    }
    
    // Ordenar: online primeiro, depois por rank
    tracked.sort((a, b) => {
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return a.rank - b.rank;
    });
    
    // Salvar estado novo (previousXP)
    const newPreviousXP = {};
    for (const r of highscores) {
      newPreviousXP[r.name] = { experience: r.experience, level: r.level };
    }
    
    await db.collection('state').updateOne(
      { _id: 'latest' },
      {
        $set: {
          lastUpdate: new Date().toISOString(),
          onlineCount: onlinePlayers.length,
          trackedCount: tracked.filter(t => t.online).length,
          totalRanked: highscores.length,
          players: tracked,
          previousXP: newPreviousXP
        }
      },
      { upsert: true }
    );
    
    // Salvar histórico em bulk
    if (historyBulk.length > 0) {
      await db.collection('history').bulkWrite(historyBulk);
    }
    
    // Salvar snapshot
    await db.collection('snapshots').insertOne({
      timestamp: now,
      onlineCount: onlinePlayers.length,
      trackedCount: tracked.filter(t => t.online).length,
      players: tracked.filter(t => t.online).map(p => ({
        name: p.name, level: p.level, experience: p.experience, xpDiff: p.xpDiff
      }))
    });
    
    // Limpar snapshots antigos (manter últimos 2000)
    const snapshotCount = await db.collection('snapshots').countDocuments();
    if (snapshotCount > 2000) {
      const oldest = await db.collection('snapshots')
        .find().sort({ timestamp: 1 }).limit(snapshotCount - 2000).toArray();
      if (oldest.length > 0) {
        const ids = oldest.map(s => s._id);
        await db.collection('snapshots').deleteMany({ _id: { $in: ids } });
      }
    }
    
    // Limpar histórico antigo (manter últimos 30 dias)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    await db.collection('history').deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
    
    console.log(`Scrape OK: ${onlinePlayers.length} online, ${tracked.filter(t => t.online).length} tracked`);
    
    res.status(200).json({
      success: true,
      onlineCount: onlinePlayers.length,
      trackedCount: tracked.filter(t => t.online).length,
      totalRanked: highscores.length,
      timestamp: now
    });
    
  } catch (err) {
    console.error('Scrape error:', err);
    res.status(500).json({ error: err.message });
  }
}
