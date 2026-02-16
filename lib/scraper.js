import axios from 'axios';
import * as cheerio from 'cheerio';

const VOCATIONS = [
  { value: '0', name: 'Andarilho' },
  { value: '1', name: 'Mago Negro' },
  { value: '2', name: 'Druida Verde' },
  { value: '3', name: 'Paladino Arcanis' },
  { value: '4', name: 'Cavaleiro Negro' },
];

const MAX_PAGES = 5;

function parseHighscorePage(html) {
  const $ = cheerio.load(html);
  const players = [];
  
  let rankTable = null;
  $('table').each((i, table) => {
    $(table).find('th').each((j, th) => {
      if ($(th).text().includes('Experiência')) {
        rankTable = table;
      }
    });
  });
  
  if (!rankTable) return players;
  
  $(rankTable).find('tbody tr').each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 5) {
      const rank = parseInt($(cells[0]).text().trim());
      const name = $(cells[1]).text().trim();
      const vocation = $(cells[2]).text().trim();
      const level = parseInt($(cells[3]).text().trim());
      const experience = parseInt($(cells[4]).text().trim());
      
      if (name && !isNaN(level) && !isNaN(experience)) {
        players.push({ rank, name, vocation, level, experience });
      }
    }
  });
  
  return players;
}

async function fetchVocationPages(vocationValue) {
  const players = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const res = await axios.get(
        `https://thirus2d.online/highscores?type=7&vocation=${vocationValue}&page=${page}`,
        { timeout: 15000 }
      );
      const parsed = parseHighscorePage(res.data);
      if (parsed.length === 0) break;
      players.push(...parsed);
    } catch (err) {
      console.error(`Erro highscores voc=${vocationValue} page=${page}:`, err.message);
    }
  }
  return players;
}

export async function fetchHighscores() {
  // Buscar todas as classes em paralelo
  const results = await Promise.all(
    VOCATIONS.map(v => fetchVocationPages(v.value))
  );
  
  // Juntar e deduplicar por nome (manter o de maior XP)
  const playerMap = new Map();
  for (const list of results) {
    for (const p of list) {
      const existing = playerMap.get(p.name);
      if (!existing || p.experience > existing.experience) {
        playerMap.set(p.name, p);
      }
    }
  }
  
  // Ordenar por XP decrescente e atribuir rank global
  const allPlayers = Array.from(playerMap.values())
    .sort((a, b) => b.experience - a.experience)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  
  return allPlayers;
}

export async function fetchOnlinePlayers() {
  try {
    const res = await axios.get('https://thirus2d.online/onlinelist', {
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    const players = [];
    
    $('#onlinelistTable tr.special').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 3) {
        const name = $(cells[0]).text().trim();
        const level = parseInt($(cells[1]).text().trim());
        const vocation = $(cells[2]).text().trim();
        const guild = cells.length >= 4 ? $(cells[3]).text().trim() : '';
        
        if (name && !isNaN(level)) {
          players.push({ name, level, vocation, guild });
        }
      }
    });
    
    return players;
  } catch (err) {
    console.error('Erro online list:', err.message);
    return [];
  }
}
