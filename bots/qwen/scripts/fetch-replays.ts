// scripts/fetch-replays.ts
// Fetch latest replays for Qwen bot from production API

const BOT_VERSION = '0.0.2';
const USERNAME = 'bruce';
const BOT_NAME = 'qwen';

async function fetchReplays(page: number = 1) {
  const url = `https://arena.briine.com/replays/${encodeURIComponent(USERNAME)}/${encodeURIComponent(BOT_NAME)}/${encodeURIComponent(BOT_VERSION)}?page=${page}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to fetch replays:', data.error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching replays:', error);
    return null;
  }
}

async function fetchGame(matchId: string) {
  const url = `https://arena.briine.com/game/${matchId}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success || !data.game) {
      console.error('Failed to fetch game:', data.error);
      return null;
    }
    
    return data.game;
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
}

async function main() {
  console.log(`Fetching replays for ${BOT_NAME} v${BOT_VERSION}...`);
  
  const replaysData = await fetchReplays(1);
  
  if (!replaysData || !replaysData.replays || replaysData.replays.length === 0) {
    console.log('No replays found for this version.');
    console.log('Trying to fetch from latest matches...');
    
    // Fetch latest matches and filter for our bot
    const latestResponse = await fetch('https://arena.briine.com/latest');
    const latestData = await latestResponse.json();
    
    if (latestData.success) {
      const ourMatches = latestData.latest.filter((match: any) => {
        return match.north_agent_name === BOT_NAME || match.south_agent_name === BOT_NAME;
      });
      
      console.log(`Found ${ourMatches.length} recent matches involving ${BOT_NAME}`);
      
      // Fetch full game data for each match
      const games = [];
      for (const match of ourMatches.slice(0, 5)) {
        console.log(`Fetching match ${match.id}...`);
        const game = await fetchGame(match.id);
        if (game) {
          games.push({
            ...match,
            game
          });
        }
      }
      
      console.log('\n=== Match Summary ===');
      for (const game of games) {
        const isNorth = game.north_agent_name === BOT_NAME;
        const won = game.nwin === 1 ? (isNorth ? 'WIN' : 'LOSS') : (isNorth ? 'LOSS' : 'WIN');
        console.log(`Match ${game.id.substring(0, 8)}... vs ${isNorth ? game.south_agent_name : game.north_agent_name} - ${won} (${game.length} turns)`);
      }
      
      return games;
    }
    return null;
  }
  
  console.log(`Found ${replaysData.replays.length} replays`);
  return replaysData;
}

main().then(result => {
  if (result) {
    console.log('\nFetch complete!');
  }
});
