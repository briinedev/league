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
 * Version 0.0.2 Kimi agent for Briine.
 *
 * Strategy overview:
 *  - Draft a balanced, high-value team: one durable defender, one hard-hitting
 *    assassin/caster, and a flexible third pick that can build or spend stack
 *    efficiently. Prefer characters whose attacks produce the elements our
 *    chosen spells need.
 *  - Pick a hidden spell pool biased toward high-burst, multi-target spells and
 *    one efficient team heal. Avoid cheap spells that do not kill.
 *  - During a match, act with a stable priority order:
 *      1. Knock out a low-HP enemy with a finishing spell if possible.
 *      2. Heal an ally in danger if a support spell is available and useful.
 *      3. Cast a big offensive spell when it will swing the board.
 *      4. Focus-fire the most vulnerable enemy with the strongest available
 *         attack matching an element we still need.
 *      5. Defend when no strong action is available or our frontliner is being
 *         focused and we want to reduce incoming damage.
 */
export default class KimiAgent extends BriineAgent {
  // Draft value: 1 (weak) to 5 (strong). Based on survivability, damage
  // potential, and stack synergy. Bumps given to characters whose attacks or
  // unique spells showed up as high-impact in local replays.
  private static readonly TIERS: Record<string, number> = {
    bastion: 5, // durable defender, can defend teammates
    vulcan: 5, // red burst spell + strong flst attack
    lupercus: 5, // wnct green builder + sustain
    morvain: 5, // black/red coverage, blood-oath utility
    terrafyre: 4, // orange/red bruiser
    solara: 4, // yellow burst potential
    veneos: 4, // purple assassin, strong tolu
    lumina: 4, // light/blue support
    tiderend: 4, // blue sustain
    aquaelia: 3, // blue/light converter; holi is weak
    seraphis: 3, // defensive support
    volturion: 3, // yellow/black niche
    nyxx: 2, // expensive unique, weak attacks
    mirage: 2, // prismatic-theft unreliable
    thornweaver: 2, // green/purple but slow
  };

  // Preferred shared spells: high-burst damage and one efficient heal.
  // We avoid cheap filler spells that do not secure kills.
  private static readonly PREFERRED_SPELLS: string[] = [
    'vulcan-cataclysm', // red, cost 0 unique only on vulcan, but keep as signal
    'amethyst-burst', // purple single-target nuke
    'flame-bolt', // red single-target nuke
    'tidal-burst', // blue 2-target nuke
    'sunflare', // yellow 2-target nuke
    'light-dawn', // light 2-target nuke
    'spark-burst', // yellow 3-target nuke
    'forge-wave', // orange 3-target nuke
    'healing-light', // light team heal
    'pulse-of-life', // green team heal
    'violet-veil', // purple 2-target, cheaper
    'burn', // red single-target
    'dark-pact', // black single-target
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

  private static isBigSpender(id: string): boolean {
    return ['vulcan', 'morvain', 'solara', 'aquaelia'].includes(id);
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

    // Prefer attacks whose elements help pay for our planned spells.
    const desiredElements = new Set(
      (this.preferredElements?.length ? this.preferredElements : [
        'red',
        'purple',
        'blue',
        'yellow',
        'green',
      ]),
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
      score += usefulAttacks * 0.4;

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
    // Score spells by desireability: big burst > team heal > cheaper damage.
    const scored = available
      .filter((s) => KimiAgent.PREFERRED_SPELLS.includes(s.id))
      .map((s) => {
        let score = 0;
        if (s.maxTargets >= 2) score += 3; // team nukes swing boards
        if (s.stackCost >= 10) score += 2; // expensive usually means impactful
        if (s.id === 'healing-light' || s.id === 'pulse-of-life') score += 4;
        if (s.id === 'vulcan-cataclysm') score += 5;
        if (s.id === 'amethyst-burst' || s.id === 'flame-bolt') score += 2;
        return { spell: s, score };
      })
      .sort((a, b) => b.score - a.score);

    const heal = available.find(
      (s) => s.id === 'healing-light' || s.id === 'pulse-of-life',
    );

    let result = scored.map((x) => x.spell);
    // Force at least one heal into the pool if available.
    if (heal && !result.some((s) => s.id === heal.id)) {
      result = [heal, ...result];
    }

    if (result.length === 0) {
      result = available.slice(0, 5);
    }

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
    const target =
      status.vulnerableEnemies?.[0] ??
      status.lowestHpEnemy ??
      status.livingEnemies[0];
    if (!target) return null;

    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available,
    );
    if (options.length === 0) return null;

    // Prefer: (1) actually kills the target, (2) cheap, (3) multi-target, (4) high cost.
    const scored = options
      .filter((o) => this.canAffordSpell(o.spell, status.stack))
      .map((o) => {
        // Estimate spell damage from stack cost as a rough proxy.
        const dmg = o.spell.stackCost * 80;
        const kills = target.hp <= dmg * 1.1;
        const multi = o.spell.maxTargets > 1 ? 1 : 0;
        const cost = o.spell.stackCost;
        return {
          option: o,
          score: (kills ? 1000 : 0) + multi * 10 - cost * 0.1,
        };
      })
      .sort((a, b) => b.score - a.score);

    const best = scored[0]?.option;
    if (!best) return null;

    // Only cast expensive non-killing spells when they clearly swing the board.
    if (best.spell.stackCost > 10) {
      const lowHpAllies = status.alliesByLowestHp?.filter((a) => a.hp <= 40)
        .length ?? 0;
      const weAreAhead = lowHpAllies === 0;
      if (!weAreAhead) return null;
    }

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

    const threshold = 50;
    const neediest = status.alliesByLowestHp?.find((a) => a.hp <= threshold && a.hp > 0);
    if (!neediest) return null;

    // Prefer multi-target heals when multiple allies are hurt, otherwise cheapest.
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

    // Skip attacking if our best option is very weak and defending preserves stamina.
    const strongest = this.pickStrongestAttack(options);
    if (!strongest) return null;

    // Prefer an attack that matches a needed element and is reasonably strong.
    const preferred = this.findPreferredAttack(options, strongest.attack);
    if (preferred) {
      return { action: preferred.attack, source: preferred.source, target };
    }

    return { action: strongest.attack, source: strongest.source, target };
  }

  private pickStrongestAttack(
    options: Array<{ source: Ally; attack: Attack }>,
  ): { source: Ally; attack: Attack } | null {
    // Use source stamina as the attack power proxy (higher stamina = harder hit).
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
        // Only prefer this element if the attack is not dramatically weaker.
        if (chosen.source.stamina >= options[0].source.stamina * 0.6 || element === fallbackElement) {
          return chosen;
        }
      }
    }
    return null;
  }

  private shouldDefend(status: MatchStatus): boolean {
    // Defend when no living ally is under heavy pressure but we lack a strong
    // spell/attack, or when our frontline is low and we want to cut incoming dmg.
    const frontliner = status.livingAllies[0];
    const frontlineHurt = frontliner ? frontliner.hp <= 35 : false;
    const anyHurt = (status.alliesByLowestHp?.[0]?.hp ?? 100) <= 25;
    return frontlineHurt || anyHurt;
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

    // If the spell has a specific element, check that color first.
    const spellElement =
      typeof spell.element === 'string'
        ? spell.element
        : (spell.element as { id: string } | undefined)?.id;
    if (spellElement && spellElement in stack) {
      const elementAmount = stack[spellElement as keyof Stack] ?? 0;
      if (elementAmount >= spell.stackCost) return true;
      // Some spells may consume from a converted/shared pool; keep total as fallback.
    }

    return KimiAgent.totalStack(stack) >= spell.stackCost;
  }
}
