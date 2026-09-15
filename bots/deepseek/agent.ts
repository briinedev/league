import BriineAgent from '@briine/sdk';
import type {
  Action,
  Ally,
  Attack,
  Character,
  MatchStatus,
  Spell,
} from '@briine/sdk';

/**
 * Version 0.0.1 DeepSeek agent for Briine.
 *
 * Strategy overview:
 *  - Draft a balanced team (defender + assassin + caster/controller) using a
 *    scored tier list and role coverage so no slot is left unfilled.
 *  - Select a hidden spell pool biased toward cheap, impactful damage plus one
 *    sustain spell so built stack converts cleanly into results.
 *  - Act with a priority heuristic: secure kills on low-HP enemies, sustain
 *    fragile allies, pressure the element we most need to build, then defend
 *    to preserve stamina.
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

  // Spell ids we prefer to keep in the hidden pool (cheap + useful).
  private static readonly PREFERRED_SPELLS: string[] = [
    'stone-fist',
    'vine-strike',
    'aqua-jet',
    'flame-bolt',
    'shadow-spike',
    'lightbeam',
    'healing-light',
    'pulse-of-life',
    'violet-veil',
  ];

  // Elements our spell pool benefits from; we bias attacks toward building them.
  private preferredElements: string[] = ['purple', 'red', 'blue', 'green'];

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

  chooseAction(status: MatchStatus): Action {
    if (!status.canAnySourceAct || status.livingEnemies.length === 0) {
      return this.doDefend(status);
    }

    const killSpell = this.tryKillSpell(status);
    if (killSpell) return killSpell;

    const heal = this.tryHeal(status);
    if (heal) return heal;

    const attack = this.tryAttack(status);
    if (attack) return attack;

    return this.doDefend(status);
  }

  private tryKillSpell(status: MatchStatus): Action | null {
    const target = status.lowestHpEnemy;
    if (!target) return null;

    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    options.sort(
      (a, b) => a.spell.stackCost - b.spell.stackCost || a.spell.maxTargets - b.spell.maxTargets,
    );
    const best = options[0];
    const budget = this.spellBudget(status);
    const cheap = best.spell.stackCost <= budget;
    const finishing = target.hp <= 45;
    if (!cheap && !finishing) return null;

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

    const neediest = status.alliesByLowestHp.find((a) => a.hp <= 45);
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

    const options = (status.attackOptions ?? []).filter((o) => o.source.canAct);
    if (options.length === 0) return null;

    const pref = this.findPreferableAttack(options);
    if (pref) return { action: pref.attack, source: pref.source, target };

    options.sort((a, b) => b.source.stamina - a.source.stamina);
    const fallback = options[0];
    return { action: fallback.attack, source: fallback.source, target };
  }

  private findPreferableAttack(
    options: Array<{ source: Ally; attack: Attack }>,
  ): { source: Ally; attack: Attack } | null {
    const prefElement = this.preferredElements.find((e) =>
      options.some((o) => o.attack.element === e),
    );
    if (!prefElement) return null;
    const candidates = options
      .filter((o) => o.attack.element === prefElement)
      .sort((a, b) => b.source.stamina - a.source.stamina);
    return candidates[0];
  }

  private doDefend(status: MatchStatus): Action {
    const source =
      status.livingAllies.find((a) => a.canAct) ??
      status.undefendedAllies?.[0] ??
      status.livingAllies[0] ??
      status.sources[0];
    return { action: 'defend', source, target: source };
  }

  private spellBudget(status: MatchStatus): number {
    const total = Object.values(status.stack).reduce((acc, v) => acc + (v ?? 0), 0);
    return Math.max(4, Math.floor(total / 6));
  }
}
