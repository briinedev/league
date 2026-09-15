import BriineAgent from '@briine/sdk';
import type {
  Action,
  ActionRequest,
  Ally,
  AllySpell,
  Attack,
  Character,
  MatchStatus,
  Spell,
  Stack,
} from '@briine/sdk';

/**
 * Version 0.0.1 Kimi agent for Briine.
 *
 * Strategy overview:
 *  - Draft a balanced, high-value team: one durable defender, one assassin, and
 *    a flexible third pick that can build or spend stack efficiently.
 *  - Pick a hidden spell pool biased toward cheap, efficient damage spells
 *    whose elements overlap our team attacks, plus one cheap team heal so we
 *    can convert stack into sustain.
 *  - During a match, act with a stable priority order:
 *      1. Knock out a low-HP enemy with a cheap/finishing spell if possible.
 *      2. Heal an ally in danger if a support spell is available and useful.
 *      3. Build stack with an attack whose element matches the cheapest
 *         available spell, or attack the most vulnerable enemy.
 *      4. Defend with a healthy, acting character to preserve stamina.
 */
export default class KimiAgent extends BriineAgent {
  // Draft value: 1 (weak) to 5 (strong). Based on survivability, damage
  // potential, and stack synergy.
  private static readonly TIERS: Record<string, number> = {
    bastion: 5,
    lupercus: 5,
    vulcan: 5,
    morvain: 4,
    solara: 4,
    veneos: 4,
    lumina: 4,
    seraphis: 3,
    tiderend: 3,
    terrafyre: 3,
    volturion: 3,
    aquaelia: 3,
    mirage: 2,
    nyxx: 2,
    thornweaver: 2,
  };

  // Preferred shared spells: cheap damage with a single cheap heal.
  private static readonly PREFERRED_SPELLS: string[] = [
    'stone-fist',
    'vine-strike',
    'aqua-jet',
    'flame-bolt',
    'shadow-spike',
    'lightbeam',
    'amethyst-burst',
    'violet-veil',
    'healing-light',
  ];

  // We update preferredElements after the spell pool is chosen so attacks can
  // build stack for spells we actually have.
  private preferredElements: string[] = ['red', 'blue', 'green', 'purple', 'yellow'];

  private static isDefender(id: string): boolean {
    return ['bastion', 'lumina', 'seraphis', 'tiderend', 'terrafyre'].includes(id);
  }

  private static isAssassin(id: string): boolean {
    return ['veneos', 'vulcan'].includes(id);
  }

  private static elementId(element: Spell['element']): string {
    return typeof element === 'string' ? element : (element as { id: string }).id;
  }

  private static totalStack(stack: Stack): number {
    return Object.values(stack).reduce((sum, v) => sum + (v ?? 0), 0);
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

    const needsDefender = !ally.some((c) => KimiAgent.isDefender(c.id));
    const needsAssassin = !ally.some((c) => KimiAgent.isAssassin(c.id));

    let best = remaining[0];
    let bestScore = -1;
    for (const c of remaining) {
      let score = KimiAgent.TIERS[c.id] ?? 1;
      if (needsDefender && KimiAgent.isDefender(c.id)) score += 2.5;
      if (needsAssassin && KimiAgent.isAssassin(c.id)) score += 2;
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
      KimiAgent.PREFERRED_SPELLS.includes(s.id),
    );
    const result = picked.length > 0 ? picked : available.slice(0, 5);
    this.preferredElements = result.map((s) => KimiAgent.elementId(s.element));
    return result;
  }

  chooseAction(status: MatchStatus): Action | ActionRequest {
    if (!status.canAnySourceAct || status.livingEnemies.length === 0) {
      return this.doDefend(status);
    }

    const kill = this.tryFinishingSpell(status);
    if (kill) return kill;

    const heal = this.tryHeal(status);
    if (heal) return heal;

    const attack = this.tryAttack(status);
    if (attack) return attack;

    return this.doDefend(status);
  }

  private tryFinishingSpell(status: MatchStatus): Action | null {
    const target = status.lowestHpEnemy;
    if (!target) return null;

    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    options.sort(
      (a, b) =>
        a.spell.stackCost - b.spell.stackCost ||
        b.spell.maxTargets - a.spell.maxTargets,
    );

    const total = KimiAgent.totalStack(status.stack);
    const best = options[0];
    const affordable = this.canAffordSpell(best.spell, status.stack);
    const finishing = target.hp <= 55;

    if (!affordable && !finishing) return null;

    return {
      action: best.spell,
      source: best.source,
      target:
        best.spell.maxTargets > 1 ? status.livingEnemies : target,
    };
  }

  private tryHeal(status: MatchStatus): Action | null {
    const options = (status.supportSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    const neediest = status.alliesByLowestHp?.find((a) => a.hp <= 60 && a.hp > 0);
    if (!neediest) return null;

    options.sort((a, b) => a.spell.stackCost - b.spell.stackCost);
    const best = options[0];
    if (!this.canAffordSpell(best.spell, status.stack)) return null;

    return {
      action: best.spell,
      source: best.source,
      target:
        best.spell.maxTargets > 1 ? status.livingAllies : neediest,
    };
  }

  private tryAttack(status: MatchStatus): Action | null {
    const target =
      status.vulnerableEnemies?.[0] ??
      status.lowestHpEnemy ??
      status.livingEnemies[0];
    if (!target) return null;

    const options = (status.attackOptions ?? []).filter((o) => o.source.canAct);
    if (options.length === 0) return null;

    const preferred = this.findPreferredAttack(options);
    if (preferred) {
      return { action: preferred.attack, source: preferred.source, target };
    }

    // Fall back to the highest-stamina attacker against the chosen target.
    options.sort((a, b) => b.source.stamina - a.source.stamina);
    const fallback = options[0];
    return { action: fallback.attack, source: fallback.source, target };
  }

  private findPreferredAttack(
    options: Array<{ source: Ally; attack: Attack }>,
  ): { source: Ally; attack: Attack } | null {
    for (const element of this.preferredElements) {
      const candidates = options
        .filter((o) => o.attack.element === element)
        .sort((a, b) => b.source.stamina - a.source.stamina);
      if (candidates.length > 0) {
        return candidates[0];
      }
    }
    return null;
  }

  private doDefend(status: MatchStatus): Action {
    const source =
      status.livingAllies.find((a) => a.canAct) ??
      status.undefendedAllies?.[0] ??
      status.livingAllies[0] ??
      status.sources[0];
    return { action: 'defend', source, target: source };
  }

  private canAffordSpell(spell: AllySpell, stack: Stack): boolean {
    // Spells with stackCost 0 (some unique spells) are always affordable.
    if (spell.stackCost <= 0) return true;
    return KimiAgent.totalStack(stack) >= spell.stackCost;
  }
}
