import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [status, setStatus] = useState(null);
  const [players, setPlayers] = useState([]);
  const [filter, setFilter] = useState('online');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ field: 'rank', asc: true });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [loading, setLoading] = useState(true);
  const [modalPlayer, setModalPlayer] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchData = useCallback(async (doScrape = false) => {
    try {
      if (doScrape) {
        await fetch('/api/scrape');
      }
      const [statusRes, trackedRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/tracked?filter=all')
      ]);
      const statusData = await statusRes.json();
      const trackedData = await trackedRes.json();
      setStatus(statusData);
      setPlayers(trackedData.players || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const forceRefresh = async () => {
    setLoading(true);
    try {
      await fetch('/api/scrape');
      await fetchData();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Auto-refresh: primeira carga faz scrape, depois a cada 60s
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchData(true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // History modal
  const showHistory = async (name) => {
    setModalPlayer(name);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(name)}`);
      const data = await res.json();
      setHistory(data.records || []);
    } catch (err) {
      console.error(err);
    }
    setHistoryLoading(false);
  };

  // Filter & sort
  const filtered = players
    .filter(p => {
      if (filter === 'online') return p.online;
      if (filter === 'offline') return !p.online;
      return true;
    })
    .filter(p => {
      if (!search) return true;
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) ||
             p.vocation.toLowerCase().includes(s) ||
             (p.guild || '').toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let va = a[sort.field];
      let vb = b[sort.field];
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
      if (va < vb) return sort.asc ? -1 : 1;
      if (va > vb) return sort.asc ? 1 : -1;
      return 0;
    });

  const onlineTracked = players.filter(p => p.online);
  const gains = players.filter(p => p.xpDiff > 0);
  const losses = players.filter(p => p.xpDiff < 0);
  const topGain = gains.length > 0 ? gains.reduce((a, b) => a.xpDiff > b.xpDiff ? a : b) : null;
  const topLoss = losses.length > 0 ? losses.reduce((a, b) => a.xpDiff < b.xpDiff ? a : b) : null;
  const totalMoved = players.reduce((sum, p) => sum + Math.abs(p.xpDiff || 0), 0);
  const topChanges = players.filter(p => p.xpDiff !== 0).sort((a, b) => Math.abs(b.xpDiff) - Math.abs(a.xpDiff)).slice(0, 6);

  const fmt = (n) => n ? n.toLocaleString('pt-BR') : '0';

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      asc: prev.field === field ? !prev.asc : field === 'name'
    }));
  };

  const vocationClass = (v) => {
    const l = v.toLowerCase();
    if (l.includes('mago')) return 'mago';
    if (l.includes('cavaleiro')) return 'cavaleiro';
    if (l.includes('paladino')) return 'paladino';
    if (l.includes('druida')) return 'druida';
    return 'andarilho';
  };

  return (
    <>
      <Head>
        <title>Painel de XP - Thirus 2D</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a1a; color: #e0e0e0; min-height: 100vh; }
        
        .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e94560; box-shadow: 0 4px 20px rgba(233,69,96,0.2); flex-wrap: wrap; gap: 15px; }
        .header h1 { font-size: 24px; color: #fff; text-shadow: 0 0 10px rgba(233,69,96,0.5); }
        .header h1 span { color: #e94560; }
        .header-stats { display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
        .stat-badge { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px; font-size: 13px; }
        .stat-badge .num { font-weight: bold; font-size: 16px; }
        .stat-badge .num.online { color: #66bb6a; }
        .stat-badge .num.tracked { color: #ffa726; }
        .stat-badge .num.ranked { color: #4fc3f7; }
        .last-update { color: #888; font-size: 12px; margin-top: 4px; }

        .btn-refresh { background: #e94560; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s; }
        .btn-refresh:hover { background: #ff6b81; box-shadow: 0 0 15px rgba(233,69,96,0.4); }
        .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

        .controls { padding: 15px 30px; display: flex; gap: 15px; align-items: center; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap; }
        .filter-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; padding: 8px 16px; border-radius: 6px; cursor: pointer; transition: all 0.3s; font-size: 13px; }
        .filter-btn:hover { background: rgba(255,255,255,0.1); }
        .filter-btn.active { background: #e94560; border-color: #e94560; color: white; }
        .search-box { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #e0e0e0; padding: 8px 16px; border-radius: 6px; font-size: 13px; width: 250px; outline: none; }
        .search-box:focus { border-color: #e94560; }
        .auto-toggle { margin-left: auto; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #888; cursor: pointer; }
        .toggle-sw { width: 40px; height: 20px; background: #333; border-radius: 10px; position: relative; transition: background 0.3s; }
        .toggle-sw.on { background: #66bb6a; }
        .toggle-sw::after { content: ''; position: absolute; width: 16px; height: 16px; background: white; border-radius: 50%; top: 2px; left: 2px; transition: left 0.3s; }
        .toggle-sw.on::after { left: 22px; }

        .main { padding: 20px 30px; }

        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .summary-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; text-align: center; }
        .summary-card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .summary-card .value { font-size: 26px; font-weight: bold; }
        .summary-card .value.gain { color: #66bb6a; }
        .summary-card .value.loss { color: #ef5350; }
        .summary-card .value.info { color: #4fc3f7; }
        .summary-card .sub { font-size: 11px; color: #666; margin-top: 4px; }

        .top-section { margin-bottom: 20px; }
        .top-section h3 { font-size: 16px; color: #ffa726; margin-bottom: 12px; }
        .top-gainers { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
        .gainer-card { background: linear-gradient(135deg, rgba(102,187,106,0.05), rgba(102,187,106,0.02)); border: 1px solid rgba(102,187,106,0.15); border-radius: 10px; padding: 15px; }
        .gainer-card.loser { background: linear-gradient(135deg, rgba(239,83,80,0.05), rgba(239,83,80,0.02)); border-color: rgba(239,83,80,0.15); }
        .gainer-name { font-weight: bold; font-size: 14px; }
        .gainer-xp { font-family: Consolas, monospace; font-size: 18px; font-weight: bold; margin: 4px 0; }
        .gainer-xp.pos { color: #66bb6a; }
        .gainer-xp.neg { color: #ef5350; }
        .gainer-info { font-size: 12px; color: #888; }

        .table-container { background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th { background: rgba(233,69,96,0.15); padding: 14px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #e94560; border-bottom: 1px solid rgba(233,69,96,0.2); cursor: pointer; user-select: none; white-space: nowrap; }
        thead th:hover { background: rgba(233,69,96,0.25); }
        tbody tr { border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
        tbody tr:hover { background: rgba(255,255,255,0.05); }
        tbody tr.online-row { background: rgba(102,187,106,0.05); }
        tbody tr.online-row:hover { background: rgba(102,187,106,0.1); }
        tbody td { padding: 12px 16px; font-size: 14px; }

        .player-name { font-weight: bold; }
        .player-name a { color: #fff; text-decoration: none; }
        .player-name a:hover { color: #e94560; text-decoration: underline; }
        .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .dot.on { background: #66bb6a; box-shadow: 0 0 6px rgba(102,187,106,0.6); animation: pulse 2s infinite; }
        .dot.off { background: #555; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        .xp-val { font-family: Consolas, monospace; font-size: 13px; }
        .xp-diff { font-family: Consolas, monospace; font-weight: bold; font-size: 13px; padding: 3px 8px; border-radius: 4px; }
        .xp-diff.pos { color: #66bb6a; background: rgba(102,187,106,0.1); }
        .xp-diff.neg { color: #ef5350; background: rgba(239,83,80,0.1); }
        .xp-diff.zero { color: #888; }
        .lvl-diff { font-size: 11px; margin-left: 4px; }
        .lvl-diff.pos { color: #66bb6a; }
        .lvl-diff.neg { color: #ef5350; }

        .voc { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
        .voc.mago { background: rgba(156,39,176,0.2); color: #ce93d8; border: 1px solid rgba(156,39,176,0.3); }
        .voc.cavaleiro { background: rgba(244,67,54,0.2); color: #ef9a9a; border: 1px solid rgba(244,67,54,0.3); }
        .voc.paladino { background: rgba(33,150,243,0.2); color: #90caf9; border: 1px solid rgba(33,150,243,0.3); }
        .voc.druida { background: rgba(76,175,80,0.2); color: #a5d6a7; border: 1px solid rgba(76,175,80,0.3); }
        .voc.andarilho { background: rgba(158,158,158,0.2); color: #bdbdbd; border: 1px solid rgba(158,158,158,0.3); }

        .rank-num { font-weight: bold; color: #ffa726; font-size: 13px; }
        .rank-num.top1 { color: #ffd700; font-size: 16px; }
        .rank-num.top2 { color: #c0c0c0; font-size: 15px; }
        .rank-num.top3 { color: #cd7f32; font-size: 15px; }

        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; justify-content: center; align-items: center; }
        .modal { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; width: 90%; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        .modal h2 { margin-bottom: 20px; color: #e94560; }
        .modal-close { float: right; background: none; border: none; color: #888; font-size: 24px; cursor: pointer; }
        .modal-close:hover { color: #fff; }
        .hist-table { width: 100%; border-collapse: collapse; }
        .hist-table th { background: rgba(233,69,96,0.1); padding: 10px; text-align: left; font-size: 12px; color: #e94560; }
        .hist-table td { padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; }

        .empty { text-align: center; padding: 60px; color: #666; }
        .loading-spin { display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(233,69,96,0.2); border-top-color: #e94560; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .guild-tag { font-size: 11px; color: #666; margin-left: 5px; }
        .hist-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; transition: all 0.3s; }
        .hist-btn:hover { background: rgba(255,255,255,0.1); }

        @media (max-width: 768px) {
          .header { flex-direction: column; }
          .controls { flex-direction: column; }
          .search-box { width: 100%; }
          .auto-toggle { margin-left: 0; }
          .main { padding: 15px; }
          tbody td, thead th { padding: 8px 10px; font-size: 12px; }
        }
      `}</style>

      {/* HEADER */}
      <div className="header">
        <div>
          <h1><span>Thirus 2D</span> - Painel de XP</h1>
          <div className="last-update">
            {status?.lastUpdate
              ? `Ultima atualizacao: ${new Date(status.lastUpdate).toLocaleString('pt-BR')}`
              : 'Aguardando primeira coleta...'}
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-badge">
            <span className="num online">{status?.onlineCount ?? '-'}</span> Online
          </div>
          <div className="stat-badge">
            <span className="num tracked">{status?.trackedCount ?? '-'}</span> Rastreados
          </div>
          <div className="stat-badge">
            <span className="num ranked">{status?.totalRanked ?? '-'}</span> No Ranking
          </div>
          <button className="btn-refresh" onClick={forceRefresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar Agora'}
          </button>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="controls">
        {['online', 'all', 'offline'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'online' ? 'Online no Ranking' : f === 'all' ? 'Todos do Ranking' : 'Offline'}
          </button>
        ))}
        <input
          className="search-box"
          placeholder="Buscar jogador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="auto-toggle" onClick={() => setAutoRefresh(!autoRefresh)}>
          Auto-refresh
          <div className={`toggle-sw ${autoRefresh ? 'on' : ''}`} />
          {autoRefresh && <span style={{ color: '#666' }}>{countdown}s</span>}
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        {/* Summary */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="label">Online no Ranking</div>
            <div className="value info">{onlineTracked.length}</div>
          </div>
          <div className="summary-card">
            <div className="label">Maior Ganho de XP</div>
            <div className="value gain">{topGain ? `+${fmt(topGain.xpDiff)}` : '-'}</div>
            {topGain && <div className="sub">{topGain.name}</div>}
          </div>
          <div className="summary-card">
            <div className="label">Maior Perda de XP</div>
            <div className="value loss">{topLoss ? fmt(topLoss.xpDiff) : '-'}</div>
            {topLoss && <div className="sub">{topLoss.name}</div>}
          </div>
          <div className="summary-card">
            <div className="label">Total XP Movimentado</div>
            <div className="value info">{fmt(totalMoved)}</div>
          </div>
        </div>

        {/* Top Changes */}
        {topChanges.length > 0 && (
          <div className="top-section">
            <h3>Maiores Mudancas de XP (ciclo atual)</h3>
            <div className="top-gainers">
              {topChanges.map(p => (
                <div key={p.name} className={`gainer-card ${p.xpDiff < 0 ? 'loser' : ''}`}>
                  <div className="gainer-name">{p.name}</div>
                  <div className={`gainer-xp ${p.xpDiff > 0 ? 'pos' : 'neg'}`}>
                    {p.xpDiff > 0 ? '+' : ''}{fmt(p.xpDiff)} XP
                  </div>
                  <div className="gainer-info">Level {p.level} - {p.vocation}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {[
                  { key: 'rank', label: 'Rank' },
                  { key: 'name', label: 'Jogador' },
                  { key: 'level', label: 'Level' },
                  { key: 'experience', label: 'Experiencia' },
                  { key: 'xpDiff', label: 'XP Ganho/Perda' },
                  { key: 'vocation', label: 'Classe' },
                ].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}>
                    {col.label} {sort.field === col.key ? (sort.asc ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading && players.length === 0 ? (
                <tr><td colSpan={7} className="empty"><div className="loading-spin" /><br />Carregando dados...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="empty">
                  {players.length === 0 ? 'Aguardando primeira coleta de dados...' : 'Nenhum jogador encontrado'}
                </td></tr>
              ) : filtered.map(p => (
                <tr key={p.name} className={p.online ? 'online-row' : ''}>
                  <td>
                    <span className={`rank-num ${p.rank === 1 ? 'top1' : p.rank === 2 ? 'top2' : p.rank === 3 ? 'top3' : ''}`}>
                      #{p.rank}
                    </span>
                  </td>
                  <td className="player-name">
                    <span className={`dot ${p.online ? 'on' : 'off'}`} />
                    <a href={`https://thirus2d.online/characterprofile.php?name=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer">
                      {p.name}
                    </a>
                    {p.guild && <span className="guild-tag">[{p.guild}]</span>}
                  </td>
                  <td>
                    {p.level}
                    {p.levelDiff > 0 && <span className="lvl-diff pos">+{p.levelDiff}</span>}
                    {p.levelDiff < 0 && <span className="lvl-diff neg">{p.levelDiff}</span>}
                  </td>
                  <td className="xp-val">{fmt(p.experience)}</td>
                  <td>
                    <span className={`xp-diff ${p.xpDiff > 0 ? 'pos' : p.xpDiff < 0 ? 'neg' : 'zero'}`}>
                      {p.xpDiff > 0 ? `+${fmt(p.xpDiff)}` : p.xpDiff < 0 ? fmt(p.xpDiff) : '0'}
                    </span>
                  </td>
                  <td><span className={`voc ${vocationClass(p.vocation)}`}>{p.vocation}</span></td>
                  <td><button className="hist-btn" onClick={() => showHistory(p.name)}>Historico</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modalPlayer && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalPlayer(null); }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setModalPlayer(null)}>&times;</button>
            <h2>Historico - {modalPlayer}</h2>
            {historyLoading ? (
              <div className="empty"><div className="loading-spin" /></div>
            ) : history.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 30 }}>
                Nenhum historico registrado ainda. Os dados serao coletados conforme o monitoramento continua.
              </p>
            ) : (
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Level</th>
                    <th>Experiencia</th>
                    <th>Variacao XP</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.timestamp).toLocaleString('pt-BR')}</td>
                      <td>{r.level}</td>
                      <td className="xp-val">{fmt(r.experience)}</td>
                      <td>
                        <span className={`xp-diff ${r.xpDiff > 0 ? 'pos' : r.xpDiff < 0 ? 'neg' : 'zero'}`}>
                          {r.xpDiff > 0 ? `+${fmt(r.xpDiff)}` : r.xpDiff < 0 ? fmt(r.xpDiff) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
