// scripts/analyze-replays.ts
// Analyze Qwen replay data to identify improvement opportunities

interface Game {
  id: string;
  north_agent_name: string;
  south_agent_name: string;
  north_agent_version: string;
  south_agent_version: string;
  nwin: number;
  length: number;
  game: {
    log: string;
    north_characters: Array<{ id: string; name: string }>;
    south_characters: Array<{ id: string; name: string }>;
    north_spellpool: Array<{ id: string; name: string }>;
    south_spellpool: Array<{ id: string; name: string }>;
    status: string;
  };
}

function parseLog(log: string): string[][] {
  return log.split('|').map(token => token.split(':'));
}

function analyzeMatch(game: Game) {
  const isNorth = game.north_agent_name === 'qwen';
  const won = isNorth ? game.nwin === 1 : game.nwin === 0;
  const ourIds = isNorth ? [1, 2, 3] : [4, 5, 6];
  const enemyIds = isNorth ? [4, 5, 6] : [1, 2, 3];
  
  const events = parseLog(game.game.log);
  
  const stats = {
    attacks: 0,
    spells: 0,
    defends: 0,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    stackGained: {} as Record<string, number>,
    stackSpent: {} as Record<string, number>,
    spellUsage: {} as Record<string, number>,
    attackUsage: {} as Record<string, number>,
    lowHpDefends: 0,
  };
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const type = event[1];
    
    if (type === 'a') {
      // Attack event: CHAR:a:ATTACK:TARGETS
      const charId = parseInt(event[0], 10);
      if (ourIds.includes(charId)) {
        stats.attacks++;
        const attack = event[2];
        stats.attackUsage[attack] = (stats.attackUsage[attack] || 0) + 1;
      }
    } else if (type === 's') {
      // Spell event: CHAR:s:SPELL:TARGETS
      const charId = parseInt(event[0], 10);
      if (ourIds.includes(charId)) {
        stats.spells++;
        const spell = event[2];
        stats.spellUsage[spell] = (stats.spellUsage[spell] || 0) + 1;
      }
    } else if (type === 'd' && event.length === 2) {
      // Defend event: CHAR:d
      const charId = parseInt(event[0], 10);
      if (ourIds.includes(charId)) {
        stats.defends++;
      }
    } else if (type === 'd' && event.length >= 3) {
      // Damage event: CHAR:d:AMOUNT:SOURCE
      const charId = parseInt(event[0], 10);
      const amount = parseInt(event[2], 10);
      if (ourIds.includes(charId)) {
        stats.damageTaken += amount;
      } else if (enemyIds.includes(charId)) {
        stats.damageDealt += amount;
      }
    } else if (event[0] === 'k' && event[1] === 'g') {
      // Stack gain: k:g:ELEMENT:AMOUNT[:SOURCE]
      const element = event[2];
      const amount = parseInt(event[3], 10);
      stats.stackGained[element] = (stats.stackGained[element] || 0) + amount;
    } else if (event[0] === 'k' && event[1] === 's') {
      // Stack spent: k:s:ELEMENT:AMOUNT[:SOURCE]
      const element = event[2];
      const amount = parseInt(event[3], 10);
      stats.stackSpent[element] = (stats.stackSpent[element] || 0) + amount;
    }
  }
  
  return {
    matchId: game.id.substring(0, 8),
    opponent: isNorth ? game.south_agent_name : game.north_agent_name,
    result: won ? 'WIN' : 'LOSS',
    turns: game.length,
    stats,
  };
}

function printAnalysis(results: Array<ReturnType<typeof analyzeMatch>>) {
  console.log('\n=== Qwen Bot Performance Analysis ===\n');
  
  const wins = results.filter(r => r.result === 'WIN').length;
  const losses = results.filter(r => r.result === 'LOSS').length;
  const winRate = ((wins / results.length) * 100).toFixed(1);
  
  console.log(`Overall Record: ${wins}W - ${losses}L (${winRate}% win rate)`);
  console.log(`Average Match Length: ${(results.reduce((sum, r) => sum + r.turns, 0) / results.length).toFixed(1)} turns\n`);
  
  // Aggregate stats
  const totalStats = {
    attacks: 0,
    spells: 0,
    defends: 0,
    damageDealt: 0,
    damageTaken: 0,
    spellUsage: {} as Record<string, number>,
    attackUsage: {} as Record<string, number>,
  };
  
  for (const result of results) {
    totalStats.attacks += result.stats.attacks;
    totalStats.spells += result.stats.spells;
    totalStats.defends += result.stats.defends;
    totalStats.damageDealt += result.stats.damageDealt;
    totalStats.damageTaken += result.stats.damageTaken;
    
    for (const [spell, count] of Object.entries(result.stats.spellUsage)) {
      totalStats.spellUsage[spell] = (totalStats.spellUsage[spell] || 0) + count;
    }
    for (const [attack, count] of Object.entries(result.stats.attackUsage)) {
      totalStats.attackUsage[attack] = (totalStats.attackUsage[attack] || 0) + count;
    }
  }
  
  console.log('=== Action Distribution ===');
  console.log(`Total Attacks: ${totalStats.attacks}`);
  console.log(`Total Spells: ${totalStats.spells}`);
  console.log(`Total Defends: ${totalStats.defends}`);
  console.log(`Attack/Spell Ratio: ${(totalStats.attacks / Math.max(1, totalStats.spells)).toFixed(2)}\n`);
  
  console.log('=== Damage Summary ===');
  console.log(`Total Damage Dealt: ${totalStats.damageDealt.toLocaleString()}`);
  console.log(`Total Damage Taken: ${totalStats.damageTaken.toLocaleString()}`);
  console.log(`Damage Ratio: ${(totalStats.damageDealt / Math.max(1, totalStats.damageTaken)).toFixed(2)}\n`);
  
  console.log('=== Most Used Spells ===');
  const sortedSpells = Object.entries(totalStats.spellUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [spell, count] of sortedSpells) {
    console.log(`  ${spell}: ${count} casts`);
  }
  
  console.log('\n=== Most Used Attacks ===');
  const sortedAttacks = Object.entries(totalStats.attackUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  for (const [attack, count] of sortedAttacks) {
    console.log(`  ${attack}: ${count} uses`);
  }
  
  console.log('\n=== Recommendations ===');
  
  // Check defend usage
  const defendRatio = totalStats.defends / (totalStats.attacks + totalStats.spells + totalStats.defends);
  if (defendRatio < 0.05) {
    console.log('⚠️  Low defend usage - consider defending more when HP is low');
  }
  
  // Check spell diversity
  const spellDiversity = sortedSpells.length;
  if (spellDiversity < 5) {
    console.log('⚠️  Low spell diversity - consider using more variety from spell pool');
  }
  
  // Check damage ratio
  if (totalStats.damageDealt < totalStats.damageTaken * 0.8) {
    console.log('⚠️  Negative damage trade - improve positioning and target selection');
  }
  
  console.log('');
}

// Main execution
const games: Game[] = [];

// This would be populated by fetch-replays.ts output
// For now, we'll analyze from stdin or a file
console.log('Reading replay data from stdin...');

let inputData = '';
process.stdin.on('data', chunk => {
  inputData += chunk.toString();
});

process.stdin.on('end', () => {
  try {
    const parsed = JSON.parse(inputData);
    
    if (Array.isArray(parsed)) {
      games.push(...parsed);
    } else if (parsed.games) {
      games.push(...parsed.games);
    }
    
    if (games.length === 0) {
      console.log('No games to analyze. Run fetch-replays.ts first and pipe the output.');
      process.exit(0);
    }
    
    const results = games.map(analyzeMatch);
    printAnalysis(results);
  } catch (error) {
    console.error('Error parsing input:', error);
    process.exit(1);
  }
});
