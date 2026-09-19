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
 * Version 0.0.3 Kimi agent for Briine.
 *
 * Changes from 0.0.2:
 *  - Spell pool is chosen to match the team's attack elements so generated
 *    stack can actually be spent. Expensive off-element spells are deprioritized.
 *  - Defending is a real priority branch: used to preserve stamina, protect
 *    low-HP/undefended allies, and avoid wasting actions on weak attacks.
 *  - Offensive spells are chosen with affordability and stack surplus in mind;
 *    we prefer multi-target spells and cheap damage conversion when high-cost
 *    finishers would leave stack unused.
 *  - Attacks avoid weak "holi" swipes when a stronger attack or a defend is
 *    clearly better.
 */
export default class KimiAgent extends BriineAgent {
  // Draft value: 1 (weak) to 5 (strong). Based on survivability, damage
  // potential, and stack synergy.
  private static readonly TIERS: Record<string, number> = {
    bastion: 5, // durable defender, light/orange attacks feed our spells
    vulcan: 5, // red burst spell + strong red attack
    lupercus: 5, // green builder + sustain
    morvain: 5, // black/red coverage, blood-oath utility
    terrafyre: 4, // orange/red bruiser
    solara: 4, // yellow burst potential
    veneos: 4, // purple assassin
    lumina: 4, // light/blue support
    tiderend: 4, // blue sustain
    aquaelia: 3, // blue/light converter
    seraphis: 3, // defensive support
    volturion: 3, // yellow/black niche
    nyxx: 2, // expensive unique, weak attacks
    mirage: 2, // prismatic-theft unreliable
    thornweaver: 2, // green/purple but slow
  };

  // Candidate spells we are willing to pick. Final selection is filtered by
  // the team's generated attack elements so the pool is actually castable.
  private static readonly CANDIDATE_SPELLS: string[] = [
    'vulcan-cataclysm', // unique red nuke, stackCost 0
    'flame-bolt', // red single-target, cheap
    'burn', // red single-target with dot
    'forge-wave', // orange 3-target
    'light-dawn', // light 2-target nuke
    'healing-light', // light team heal
    'sunflare', // yellow 2-target
    'spark-burst', // yellow 3-target
    'amethyst-burst', // purple single-target
    'violet-veil', // purple 2-target
    'tidal-burst', // blue 2-target
    'aqua-jet', // blue single-target, cheap
    'lightbeam', // yellow single-target, cheap
    'stone-fist', // orange single-target, very cheap
  ];

  // Elements our current draft can generate through attacks. Updated after
  // character selection so spell/attack choices can build and spend stack.
  private generatedElements: Set<string> = new Set();

  // Elements we want to generate with attacks based on the chosen spell pool.
  private preferredElements: string[] = [];

  private static isDefender(id: string): boolean {
    return ['bastion', 'lumina', 'seraphis', 'tiderend', 'terrafyre'].includes(id);
  }

  private static isAssassin(id: string): boolean {
    return ['veneos', 'vulcan'].includes(id);
  }

  private static elementId(element: Spell['element']): string {
    return typeof element === 'string' ? element : (element as { id: string }).id;
  }

  private static attackElement(attack: Attack): string {
    return typeof attack.element === 'string'
      ? attack.element
      : (attack.element as { id: string }).id;
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

    // Once we know our first picks, bias toward characters whose attack
    // elements overlap with the spells we want to cast.
    const desiredElements = new Set(
      this.preferredElements.length ? this.preferredElements : ['orange', 'red', 'light', 'yellow'],
    );

    let best = remaining[0];
    let bestScore = -1;
    for (const c of remaining) {
      let score = KimiAgent.TIERS[c.id] ?? 1;
      if (needsDefender && KimiAgent.isDefender(c.id)) score += 2.5;
      if (needsAssassin && KimiAgent.isAssassin(c.id)) score += 2;

      const attacks = c.attacks ?? [];
      const usefulAttacks = attacks.filter((a) =>
        desiredElements.has(KimiAgent.attackElement(a)),
      ).length;
      score += usefulAttacks * 0.6;

      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    // Track generated elements as picks are locked in.
    for (const a of best.attacks ?? []) {
      this.generatedElements.add(KimiAgent.attackElement(a));
    }
    return best;
  }

  chooseSpells(
    available: Spell[],
    _ally: Character[],
    _enemy: Character[],
  ): Spell[] {
    // Filter to candidates that are available in this draft.
    const candidates = available.filter((s) =>
      KimiAgent.CANDIDATE_SPELLS.includes(s.id),
    );

    if (candidates.length === 0) {
      this.preferredElements = available.slice(0, 5).map((s) => KimiAgent.elementId(s.element));
      return available.slice(0, 5);
    }

    // Score each candidate: big bonus if its element is generated by our team.
    const scored = candidates.map((s) => {
      const el = KimiAgent.elementId(s.element);
      const generated = this.generatedElements.has(el) ? 1 : 0;
      const convertible = this.generatedElements.has(KimiAgent.oppositeElement(el)) ? 0.5 : 0;
      let score = 0;
      if (s.id === 'vulcan-cataclysm') score += 8; // unique free nuke
      if (generated) score += 6;
      if (convertible) score += 2;
      if (s.maxTargets >= 2) score += 3;
      if (s.id === 'healing-light') score += 5; // reliable team heal
      // Prefer costs we can realistically pay; very expensive off-element spells lose points.
      if (s.stackCost <= 8) score += 2;
      else if (s.stackCost <= 12) score += 1;
      else score -= 2;
      return { spell: s, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Force a heal if we picked one.
    const heal = candidates.find((s) => s.id === 'healing-light');
    let result = scored.map((x) => x.spell);
    if (heal && !result.some((s) => s.id === 'healing-light')) {
      result = [heal, ...result.filter((s) => s.id !== 'healing-light')];
    }

    // Cap at the top 5 spells; the server truncates anyway, but keep it tidy.
    result = result.slice(0, 5);

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

    // Spend surplus stack on a useful offensive spell before it caps or before
    // we waste actions on weak attacks.
    const big = this.tryOffensiveSpell(status);
    if (big) return big;

    // Defend when it is better than a weak attack, then fall back to attack.
    if (this.shouldDefend(status)) {
      return this.doDefend(status);
    }

    const attack = this.tryAttack(status);
    if (attack) return attack;

    return this.doDefend(status);
  }

  private tryFinishingSpell(status: MatchStatus): Action | null {
    const target =
      status.vulnerableEnemies?.[0] ??
      status.lowestHpEnemy ??
      status.livingEnemies[0];
    if (!target) return null;

    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    const scored = options
      .filter((o) => this.canAffordSpell(o.spell, status.stack))
      .map((o) => {
        const dmg = this.estimateSpellDamage(o.spell, status);
        const kills = target.hp <= dmg * 1.1;
        const multi = o.spell.maxTargets > 1 ? 1 : 0;
        const cost = o.spell.stackCost;
        return {
          option: o,
          score: (kills ? 1000 : 0) + multi * 8 - cost * 0.2,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.option;
    if (!best) return null;

    // Only cast expensive non-killing spells when we are not in danger.
    if (best.spell.stackCost > 10 && !this.weAreAhead(status)) {
      return null;
    }

    return {
      action: best.spell,
      source: best.source,
      target: best.spell.maxTargets > 1 ? status.livingEnemies : target,
    };
  }

  private tryOffensiveSpell(status: MatchStatus): Action | null {
    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    const total = KimiAgent.totalStack(status.stack);
    // Only look for a non-killing spend when we have meaningful surplus.
    if (total < 18) return null;

    const target =
      status.vulnerableEnemies?.[0] ??
      status.lowestHpEnemy ??
      status.livingEnemies[0];
    if (!target) return null;

    const scored = options
      .filter((o) => this.canAffordSpell(o.spell, status.stack))
      .filter((o) => o.spell.stackCost >= 8)
      .map((o) => {
        const dmg = this.estimateSpellDamage(o.spell, status);
        const kills = target.hp <= dmg * 1.1;
        const multi = o.spell.maxTargets > 1 ? 1 : 0;
        const el = KimiAgent.elementId(o.spell.element);
        const matches = this.generatedElements.has(el) ? 1 : 0;
        return {
          option: o,
          score: (kills ? 500 : 0) + multi * 5 + matches * 3 - o.spell.stackCost * 0.15,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.option;
    if (!best) return null;
    // Do not spend expensive spells when behind or when the spell is off-element
    // and we have no surplus to spare.
    if (best.spell.stackCost > 12 && !this.weAreAhead(status)) return null;

    return {
      action: best.spell,
      source: best.source,
      target: best.spell.maxTargets > 1 ? status.livingEnemies : target,
    };
  }

  private tryHeal(status: MatchStatus): Action | null {
    const options = (status.supportSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    const threshold = 50;
    const neediest = status.alliesByLowestHp?.find((a) => a.hp <= threshold && a.hp > 0);
    if (!neediest) return null;

    options.sort((a, b) => {
      const hurt = status.alliesByLowestHp?.filter((a) => a.hp <= threshold).length ?? 0;
      const aMulti = a.spell.maxTargets > 1 ? 1 : 0;
      const bMulti = b.spell.maxTargets > 1 ? 1 : 0;
      if (hurt > 1) return bMulti - aMulti || a.spell.stackCost - b.spell.stackCost;
      return a.spell.stackCost - b.spell.stackCost;
    });

    const best = options[0];
    if (!this.canAffordSpell(best.spell, status.stack)) return null;

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

    const strongest = this.pickStrongestAttack(options);
    if (!strongest) return null;

    const preferred = this.findPreferredAttack(options, strongest.attack);
    if (preferred) {
      return { action: preferred.attack, source: preferred.source, target };
    }

    // If the strongest attack is weak and we are ahead or low on stamina, defend
    // instead of burning an action on a holi swipe. We already passed shouldDefend,
    // so this is the remaining fallback.
    if (strongest.source.stamina < 20 && KimiAgent.attackElement(strongest.attack) === 'light') {
      return null;
    }

    return { action: strongest.attack, source: strongest.source, target };
  }

  private pickStrongestAttack(
    options: Array<{ source: Ally; attack: Attack }>,
  ): { source: Ally; attack: Attack } | null {
    let best: { source: Ally; attack: Attack } | null = null;
    let bestPower = -1;
    for (const o of options) {
      const power = o.source.stamina;
      if (power > bestPower) {
        bestPower = power;
        best = o;
      }
    }
    return best;
  }

  private findPreferredAttack(
    options: Array<{ source: Ally; attack: Attack }>,
    fallbackAttack: Attack,
  ): { source: Ally; attack: Attack } | null {
    const fallbackElement = KimiAgent.attackElement(fallbackAttack);
    for (const element of this.preferredElements) {
      const candidates = options
        .filter((o) => KimiAgent.attackElement(o.attack) === element)
        .sort((a, b) => b.source.stamina - a.source.stamina);
      if (candidates.length > 0) {
        const chosen = candidates[0];
        if (chosen.source.stamina >= options[0].source.stamina * 0.5 || element === fallbackElement) {
          return chosen;
        }
      }
    }
    return null;
  }

  private shouldDefend(status: MatchStatus): boolean {
    // Defend when we are ahead and the best available attack is weak, saving
    // stamina for stronger turns.
    const options = (status.attackOptions ?? []).filter((o) => o.source.canAct);
    const strongest = options.sort((a, b) => b.source.stamina - a.source.stamina)[0];
    const weakAttackAvailable =
      !!strongest &&
      strongest.source.stamina < 25 &&
      KimiAgent.attackElement(strongest.attack) === 'light';

    if (status.hasHpLead && status.hasActionEconomyLead && weakAttackAvailable) {
      return true;
    }

    // Defend a low-HP ally that is not already defended.
    const lowAlly = status.undefendedAllies?.find((a) => a.hp <= 35 && a.hp > 0);
    if (lowAlly) return true;

    // Defend if any ally is critically low regardless of lead.
    const criticalAlly = status.alliesByLowestHp?.find((a) => a.hp <= 25 && a.hp > 0);
    if (criticalAlly) return true;

    return false;
  }

  private doDefend(status: MatchStatus): Action {
    const source =
      status.undefendedAllies?.find((a) => a.canAct) ??
      status.livingAllies.find((a) => a.canAct) ??
      status.sources[0];
    return { action: 'defend', source, target: source };
  }

  private weAreAhead(status: MatchStatus): boolean {
    const lowHpAllies = status.alliesByLowestHp?.filter((a) => a.hp <= 40).length ?? 0;
    return lowHpAllies === 0 && status.hasHpLead;
  }

  private canAffordSpell(spell: AllySpell, stack: Stack): boolean {
    if (spell.stackCost <= 0) return true;

    const spellElement =
      typeof spell.element === 'string'
        ? spell.element
        : (spell.element as { id: string } | undefined)?.id;
    if (spellElement && spellElement in stack) {
      const elementAmount = stack[spellElement as keyof Stack] ?? 0;
      if (elementAmount >= spell.stackCost) return true;
    }

    return KimiAgent.totalStack(stack) >= spell.stackCost;
  }

  private estimateSpellDamage(spell: AllySpell, status: MatchStatus): number {
    // Damage scales with stack cost and number of targets; long matches also
    // scale via enrage, but that is symmetric so ignore it here.
    const base = spell.stackCost * 75;
    return spell.maxTargets > 1 ? base * (1 + spell.maxTargets * 0.25) : base;
  }

  private static oppositeElement(element: string): string {
    const opposites: Record<string, string> = {
      red: 'blue',
      blue: 'red',
      green: 'yellow',
      yellow: 'green',
      light: 'dark',
      dark: 'light',
      purple: 'orange',
      orange: 'purple',
    };
    return opposites[element] ?? element;
  }
}
