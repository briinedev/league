import BriineAgent from '@briine/sdk';
import type {
  Action,
  Ally,
  AllySpell,
  Attack,
  Character,
  MatchStatus,
  Spell,
} from '@briine/sdk';

/**
 * Version 0.0.2 DeepSeek agent for Briine.
 *
 * Strategy overview (v0.0.2): after reviewing replays (3W/2L, elo 432), the
 * bot over-spammed light (holi) attacks without aligning to a win engine and
 * never defended. This version:
 *  - Focuses the spell pool on red/blue cheap damage to fuel vulcan-cataclysm.
 *  - Prefers red > blue > light attacks that build the win engine.
 *  - Uses a dedicated "cataclysm" trigger when red stack >= 12.
 *  - Defends low-stamina sources to preserve turns.
 */
export default class DeepSeekAgent extends BriineAgent {
  // Draft rough value 1 (weak) to 5 (strong) for each playable id.
  private static readonly TIERS: Record<string, number> = {
    bastion: 5,
    lupercus: 5,
    vulcan: 4,
    morvain: 4,
    solara: 4,
    seraphis: 3,
    lumina: 3,
    tiderend: 3,
    veneos: 3,
    volturion: 3,
    aquaelia: 2,
    mirage: 2,
    nyxx: 2,
    terrafyre: 2,
    thornweaver: 2,
  };

  // Spell ids we prefer to keep in the hidden pool.
  // Red/blue light damage fuels our primary win engine (vulcan-cataclysm) while
  // cheap green/orange spells convert leftover stack efficiently. We drop the
  // diluted purple/green support spells from v0.0.1 to keep stack focused.
  private static readonly PREFERRED_SPELLS: string[] = [
    'flame-bolt', // red single-target, 8 cost
    'aqua-jet', // blue single-target, 8 cost
    'stone-fist', // orange 5 cost
    'vine-strike', // green 5 cost
    'lightbeam', // yellow 8 cost
    'shadow-spike', // black 8 cost
  ];

  // Elements our win engine wants to build: red (vulcan) and light (burst
  // damage on our casters/assassin). We bias attacks toward these.
  private preferredElements: string[] = ['red', 'blue'];

  static isDefender(id: string): boolean {
    return ['bastion', 'lumina', 'seraphis', 'tiderend', 'terrafyre'].includes(id);
  }

  static isAssassin(id: string): boolean {
    return id === 'veneos' || id === 'vulcan';
  }

  chooseCharacter(
    available: Character[],
    ally: Character[],
    enemy: Character[],
  ): Character {
    const taken = new Set<string>([
      ...ally.map((c) => c.id),
      ...enemy.map((c) => c.id),
    ]);
    const remaining = available.filter((c) => !taken.has(c.id));
    if (remaining.length === 0) return available[0];

    const needsDefender = !ally.some((c) => DeepSeekAgent.isDefender(c.id));
    const needsAssassin = !ally.some((c) => DeepSeekAgent.isAssassin(c.id));

    let best = remaining[0];
    let bestScore = -1;
    for (const c of remaining) {
      let score = DeepSeekAgent.TIERS[c.id] ?? 1;
      if (needsDefender && DeepSeekAgent.isDefender(c.id)) score += 2;
      if (needsAssassin && DeepSeekAgent.isAssassin(c.id)) score += 2;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  chooseSpells(
    available: Spell[],
    _ally: Character[],
    _enemy: Character[],
  ): Spell[] {
    const picked = available.filter((s) =>
      DeepSeekAgent.PREFERRED_SPELLS.includes(s.id),
    );
    const result = picked.length > 0 ? picked : available;
    this.preferredElements = result.map((s) => DeepSeekAgent.elementId(s.element));
    return result;
  }

  private static elementId(element: Spell['element']): string {
    // Runtime sends either a plain element string or an object { id, op }.
    return typeof element === 'string' ? element : (element as unknown as { id: string }).id;
  }

  // A character that cannot afford to act this turn should preserve stamina and
  // defend (defending costs no stamina) rather than wasting a weak attack.
  private static readonly MIN_ACT_STAMINA = 2;

  chooseAction(status: MatchStatus): Action {
    if (!status.canAnySourceAct || status.livingEnemies.length === 0) {
      return this.doDefend(status);
    }

    // 1. Fire the win engine: vulcan-cataclysm when we hold enough red stack.
    const cataclysm = this.tryCataclysm(status);
    if (cataclysm) return cataclysm;

    // 2. Secure a kill on a low-HP enemy.
    const killSpell = this.tryKillSpell(status);
    if (killSpell) return killSpell;

    // 3. Sustain a fragile ally.
    const heal = this.tryHeal(status);
    if (heal) return heal;

    // 4. Build red/light stack with attacks that align to our win engine.
    const attack = this.tryAttack(status);
    if (attack) return attack;

    // 5. Preserve a dead turn as a defend.
    return this.doDefend(status);
  }

  /** Fire vulcan-cataclysm (biggest payoff) when we have enough red stack. */
  private tryCataclysm(status: MatchStatus): Action | null {
    const options = (status.castableSpells ?? []).filter(
      (o) =>
        o.source.canAct &&
        o.spell.available &&
        o.spell.id === 'vulcan-cataclysm',
    );
    if (options.length === 0) return null;

    const red = Number(status.stack.red) || 0;
    // Cast once we have a meaningful pile; the spell consumes all red stack and
    // scales with it, so a big fire later is usually better on a focused enemy.
    if (red < 12) return null;

    const best = options[0];
    // Prioritise a lone/low target to concentrate the burst.
    const target =
      status.livingEnemies.length === 1
        ? status.livingEnemies[0]
        : status.lowestHpEnemy ?? status.livingEnemies[0];
    return { action: best.spell, source: best.source, target: target as Character };
  }

  private tryKillSpell(status: MatchStatus): Action | null {
    const target = status.lowestHpEnemy;
    if (!target) return null;

    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    // Spend a spell only when it can plausibly finish the target or is cheap.
    const finishable = target.hp <= 50;
    const cheap = options.some((o) => o.spell.stackCost <= this.stackFor(spellElement(o.spell), status) + 2);
    if (!finishable && !cheap) return null;

    options.sort(
      (a, b) => a.spell.stackCost - b.spell.stackCost || a.spell.maxTargets - b.spell.maxTargets,
    );
    const best = options[0];
    return {
      action: best.spell,
      source: best.source,
      target:
        best.spell.maxTargets > 1 ? status.livingEnemies : target,
    };
  }

  private tryHeal(status: MatchStatus): Action | null {
    const support = (status.supportSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (support.length === 0) return null;

    const neediest = status.alliesByLowestHp.find((a) => a.hp <= 35);
    if (!neediest) return null;

    support.sort((a, b) => a.spell.stackCost - b.spell.stackCost);
    const best = support[0];
    return {
      action: best.spell,
      source: best.source,
      target: best.spell.maxTargets > 1 ? status.livingAllies : neediest,
    };
  }

  private tryAttack(status: MatchStatus): Action | null {
    const target =
      status.vulnerableEnemies?.[0] ??
      status.lowestHpEnemy ??
      status.livingEnemies[0];
    if (!target) return null;

    const options = (status.attackOptions ?? []).filter(
      (o) =>
        o.source.canAct &&
        o.source.stamina >= DeepSeekAgent.MIN_ACT_STAMINA,
    );
    if (options.length === 0) return null;

    // Prefer red (vulcan engine) > blue > light > other.
    const prefAttack = this.findWinEngineAttack(options);
    if (prefAttack) return { action: prefAttack.attack, source: prefAttack.source, target };

    options.sort(
      (a, b) =>
        this.attackPriority(b.source, b.attack) -
        this.attackPriority(a.source, a.attack) ||
        b.source.stamina - a.source.stamina,
    );
    const fallback = options[0];
    return { action: fallback.attack, source: fallback.source, target };
  }

  /** Choose the attack that best builds our win engine: red > blue > light. */
  private findWinEngineAttack(
    options: Array<{ source: Ally; attack: Attack }>,
  ): { source: Ally; attack: Attack } | null {
    // Order: red (vulcan engine) then blue then light then anything.
    const ranked = [...options].sort(
      (a, b) =>
        this.attackPriority(b.source, b.attack) - this.attackPriority(a.source, a.attack),
    );
    return ranked[0];
  }

  private attackPriority(source: Ally, attack: Attack): number {
    const elem = String(attack.element);
    // Red is the primary win engine (vulcan-cataclysm consumes red).
    if (elem === 'red') return this.vulcanBoost(source) + 100;
    if (elem === 'blue') return this.vulcanBoost(source) + 80;
    if (elem === 'light') return this.vulcanBoost(source) + 60;
    return this.vulcanBoost(source);
  }

  private vulcanBoost(source: Ally): number {
    // vulcan has a huge red payoff; prefer its attacks. Otherwise generic.
    return source.id === 'vulcan' ? 20 : 0;
  }

  private stackFor(element: string | { id: string }, status: MatchStatus): number {
    const id = typeof element === 'string' ? element : element.id;
    return Number((status.stack as Record<string, unknown>)[id]) || 0;
  }

  private doDefend(status: MatchStatus): Action {
    // Prefer defending the source with the least stamina to protect it.
    const source =
      [...status.sources].sort((a, b) => a.stamina - b.stamina)[0] ??
      status.livingAllies[0] ??
      status.sources[0];
    return { action: 'defend', source, target: source };
  }
}

function spellElement(spell: AllySpell): string | { id: string } {
  return spell.element;
}
