import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchHighscores() {
  const allPlayers = [];
  
  for (let page = 1; page <= 5; page++) {
    try {
      const res = await axios.get(
        `https://thirus2d.online/highscores?type=7&vocation=all&page=${page}`,
        { timeout: 15000 }
      );
      const $ = cheerio.load(res.data);
      
      let rankTable = null;
      $('table').each((i, table) => {
        $(table).find('th').each((j, th) => {
          if ($(th).text().includes('Experiência')) {
            rankTable = table;
          }
        });
      });
      
      if (!rankTable) continue;
      
      $(rankTable).find('tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 5) {
          const rank = parseInt($(cells[0]).text().trim());
          const name = $(cells[1]).text().trim();
          const vocation = $(cells[2]).text().trim();
          const level = parseInt($(cells[3]).text().trim());
          const experience = parseInt($(cells[4]).text().trim());
          
          if (name && !isNaN(level) && !isNaN(experience)) {
            allPlayers.push({ rank, name, vocation, level, experience });
          }
        }
      });
    } catch (err) {
      console.error(`Erro highscores page ${page}:`, err.message);
    }
  }
  
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
