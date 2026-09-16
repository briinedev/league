// scripts/analyze-replays.ts
// Summarize a Kimi replay file to guide strategy iteration.

import replays from '../data/replays-0.0.1.json' with { type: 'json' };

interface Replay {
  id: string;
  agent_side: 'north' | 'south';
  nwin: number;
  log: string;
}

const all = (replays as { replays: Replay[] }).replays;

function ourIds(r: Replay): number[] {
  return r.agent_side === 'south' ? [4, 5, 6] : [1, 2, 3];
}
function oppIds(r: Replay): number[] {
  return r.agent_side === 'south' ? [1, 2, 3] : [4, 5, 6];
}
function weWon(r: Replay): boolean {
  return r.agent_side === 'south' ? r.log.endsWith('sw!') : r.log.endsWith('nw!');
}

function actionCounts(r: Replay) {
  const ours = ourIds(r);
  const opp = oppIds(r);
  const counts = { ours: { a: 0, s: 0, d: 0 }, opp: { a: 0, s: 0, d: 0 } };
  for (const t of r.log.split('|')) {
    const p = t.split(':');
    if (p.length >= 2 && ['a', 's', 'd'].includes(p[1])) {
      const id = parseInt(p[0], 10);
      if (ours.includes(id)) counts.ours[p[1] as 'a' | 's' | 'd']++;
      else if (opp.includes(id)) counts.opp[p[1] as 'a' | 's' | 'd']++;
    }
  }
  return counts;
}

function damageSummary(r: Replay) {
  const ours = ourIds(r);
  const opp = oppIds(r);
  const out = { ourDmg: 0, ourHeal: 0, oppDmg: 0, oppHeal: 0 };
  for (const t of r.log.split('|')) {
    const p = t.split(':');
    if (p[1] === 'd') {
      const amt = parseInt(p[2], 10);
      const id = parseInt(p[0], 10);
      if (Number.isNaN(amt) || Number.isNaN(id)) continue;
      if (opp.includes(id)) amt > 0 ? (out.ourDmg += amt) : (out.oppHeal += -amt);
      if (ours.includes(id)) amt > 0 ? (out.oppDmg += amt) : (out.ourHeal += -amt);
    }
  }
  return out;
}

function spellDamage(r: Replay, ids: number[]) {
  const spellDmg: Record<string, number> = {};
  const spellCasts: Record<string, number> = {};
  const tokens = r.log.split('|');
  for (let i = 0; i < tokens.length; i++) {
    const p = tokens[i].split(':');
    if (p.length >= 4 && p[1] === 's' && ids.includes(parseInt(p[0], 10))) {
      const spell = p[2];
      spellCasts[spell] = (spellCasts[spell] ?? 0) + 1;
      for (let j = i + 1; j < tokens.length && j < i + 30; j++) {
        const q = tokens[j].split(':');
        if (q.length >= 4 && q[1] === 'd' && parseInt(q[2], 10) > 0) {
          spellDmg[spell] = (spellDmg[spell] ?? 0) + parseInt(q[2], 10);
        }
      }
    }
  }
  return { casts: spellCasts, dmg: spellDmg };
}

function attackDamage(r: Replay, ids: number[]) {
  const dmg: Record<string, number> = {};
  const hits: Record<string, number> = {};
  const tokens = r.log.split('|');
  for (let i = 0; i < tokens.length; i++) {
    const p = tokens[i].split(':');
    if (p.length >= 4 && p[1] === 'a' && ids.includes(parseInt(p[0], 10))) {
      const atk = p[2];
      hits[atk] = (hits[atk] ?? 0) + 1;
      for (let j = i + 1; j < tokens.length && j < i + 15; j++) {
        const q = tokens[j].split(':');
        if (q.length >= 4 && q[1] === 'd' && parseInt(q[2], 10) > 0) {
          dmg[atk] = (dmg[atk] ?? 0) + parseInt(q[2], 10);
        }
      }
    }
  }
  return { hits, dmg };
}

function focusRatio(r: Replay) {
  const opp = oppIds(r);
  const tokens = r.log.split('|');
  const focusId = opp[0];
  let attacks = 0;
  let focus = 0;
  for (const t of tokens) {
    const p = t.split(':');
    if (p.length >= 4 && p[1] === 'a' && ourIds(r).includes(parseInt(p[0], 10))) {
      attacks++;
      if (p[3] === String(focusId)) focus++;
    }
  }
  return attacks ? Math.round((focus / attacks) * 100) : 0;
}

function deathOrder(r: Replay) {
  const ours = ourIds(r);
  const opp = oppIds(r);
  const alive: Record<number, boolean> = {};
  [...ours, ...opp].forEach((id) => (alive[id] = true));
  const deaths: Array<{ id: number; ours: boolean }> = [];
  let actionCount = 0;
  for (const t of r.log.split('|')) {
    if (/^\d+:d$/.test(t)) {
      actionCount++;
      const id = parseInt(t.split(':')[0], 10);
      if (alive[id]) {
        alive[id] = false;
        deaths.push({ id, ours: ours.includes(id) });
      }
    }
  }
  return deaths;
}

for (const r of all) {
  const actions = actionCounts(r);
  const dmg = damageSummary(r);
  const ourSpells = spellDamage(r, ourIds(r));
  const ourAttacks = attackDamage(r, ourIds(r));
  console.log('\n---', r.id.slice(0, 8), 'won?', weWon(r), '---');
  console.log('actions', actions);
  console.log('damage', dmg, 'net', dmg.ourDmg - dmg.oppDmg);
  console.log('focus%', focusRatio(r));
  console.log('deaths', deathOrder(r));
  console.log('our spells', ourSpells);
  console.log('our attacks', ourAttacks);
}

// Aggregate across all replays
const aggSpells: Record<string, { casts: number; dmg: number }> = {};
const aggAttacks: Record<string, { hits: number; dmg: number }> = {};
for (const r of all) {
  const sp = spellDamage(r, ourIds(r));
  for (const [k, v] of Object.entries(sp.casts)) {
    aggSpells[k] = aggSpells[k] || { casts: 0, dmg: 0 };
    aggSpells[k].casts += v;
    aggSpells[k].dmg += sp.dmg[k] ?? 0;
  }
  const at = attackDamage(r, ourIds(r));
  for (const [k, v] of Object.entries(at.hits)) {
    aggAttacks[k] = aggAttacks[k] || { hits: 0, dmg: 0 };
    aggAttacks[k].hits += v;
    aggAttacks[k].dmg += at.dmg[k] ?? 0;
  }
}

console.log('\n=== AGGREGATED SPELL DAMAGE ===');
for (const [k, v] of Object.entries(aggSpells).sort((a, b) => b[1].dmg - a[1].dmg)) {
  console.log(k, 'casts', v.casts, 'dmg', v.dmg, 'avg', Math.round(v.dmg / v.casts));
}
console.log('\n=== AGGREGATED ATTACK DAMAGE ===');
for (const [k, v] of Object.entries(aggAttacks).sort((a, b) => b[1].dmg - a[1].dmg)) {
  console.log(k, 'hits', v.hits, 'dmg', v.dmg, 'avg', Math.round(v.dmg / v.hits));
}
