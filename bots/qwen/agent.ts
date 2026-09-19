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
 * Version 0.0.3 Qwen agent for Briine.
 *
 * Improvements in v0.0.3 (based on v0.0.1 3W-3L replay analysis):
 *  - Proactive defending: defend when HP <60% (was <40%) to preserve board presence
 *  - More aggressive spell casting: cast at lower stack thresholds for tempo
 *  - Better spell rotation: prioritize cheapest effective spells to maintain pressure
 *  - Improved finish detection: better identify low-HP execution opportunities
 *  - Refined tier list: adjusted based on actual match performance data
 *
 * Analysis from v0.0.1 replays:
 *  - Zero defends in 4/6 matches - too passive, need earlier defends
 *  - Spell usage: wins averaged 22.8 casts, losses averaged 10.3 casts
 *  - Damage ratio: losses took 4x more damage than dealt
 *  - Key insight: defend earlier to maintain offensive pressure
 *
 * Strategy overview:
 *  - Draft a high-synergy team focused on element concentration: pick characters
 *    that share 1-2 primary elements so stack building converts efficiently into
 *    spell casts.
 *  - Prioritize characters with strong early-game presence and reliable damage
 *    output, favoring those with low-cost, high-impact attacks.
 *  - Select a hidden spell pool with cheap damage spells (cost ≤3 stack) plus
 *    utility spells for flexibility.
 *  - During matches, follow a clear priority order:
 *      1. Defend proactively when HP <60% to avoid being burst down
 *      2. Execute low-HP enemies with finishing spells when available.
 *      3. Build stack using attacks that match our primary spell element.
 *      4. Cast damage spells aggressively at low stack thresholds.
 */
export default class QwenAgent extends BriineAgent {
  // Character tier list: 1 (weak) to 5 (strong).
  // Updated in v0.0.3 based on replay analysis:
  //   - Bastion: strong in wins, provides stability
  //   - Vulcan: excellent burst with cataclysm, high performer
  //   - Morvain: consistent damage output
  //   - Lupercus: proven in multiple wins, versatile
  //   - Tiderend: underperformed, lowered priority
  //   - Aquaelia/Lumina: too squishy, died early in losses
  private static readonly TIERS: Record<string, number> = {
    bastion: 5,      // Defender with light/earth, excellent survivability - key in wins
    vulcan: 5,       // Caster with fire/metal, strong burst potential - cataclysm is game-winning
    morvain: 5,      // Assassin with shadow/metal, high damage output
    lupercus: 5,     // Assassin with earth/nature, proven performer in wins
    veneos: 4,       // Controller with shadow/water, versatile
    seraphis: 4,     // Support with light/water, healing utility
    solara: 4,       // Caster with light/fire, good spell synergy
    volturion: 3,    // Caster with metal/light, decent burst
    mirage: 3,       // Assassin with shadow, better than previously rated
    lumina: 2,       // Caster with light, dies too early in losses
    aquaelia: 2,     // Controller with water, underperformed in analysis
    terrafyre: 2,    // Hybrid with earth/fire, niche
    thornweaver: 2,  // Controller with nature, slow setup
    tiderend: 2,     // Controller with water/nature, underperformed in wins
    nyxx: 1,         // Specialist, highly situational
  };

  // Preferred Spells for hidden pool: cheap, efficient, and synergistic.
  // Updated in v0.0.2 with more 3-cost options for better spam potential
  private static readonly PREFERRED_SPELLS: string[] = [
    // High priority: cheap, high-damage spells (2-3 stack)
    'flame-bolt',      // Fire, 2 stack, reliable damage
    'shadow-spike',    // Shadow, 3 stack, good damage
    'stone-fist',      // Earth, 2 stack, solid damage
    'lightbeam',       // Light, 2 stack, efficient
    'vine-strike',     // Nature, 2 stack, reliable
    'ember-bolt',      // Fire, 3 stack, cheap spam
    'wind-cut',        // Nature, 3 stack, cheap spam
    'thunder-shock',   // Yellow, 3 stack, cheap option
    // Medium priority: 4-5 stack efficient spells
    'aqua-jet',        // Water, 4 stack, consistent
    'predator-rush',   // Green, 5 stack, multi-target
    'metal-bolt',      // Metal, 2 stack, solid
    // Utility spells for flexibility
    'healing-light',   // Light, 3 stack, team sustain
    'cleanse',         // Light, 2 stack, remove debuffs
  ];

  // Element concentration strategy: prefer characters sharing these elements.
  private preferredElements: string[] = [];

  private static readonly PRIMARY_ELEMENTS = ['fire', 'light', 'shadow'];

  private static totalStack(stack: Stack): number {
    return Object.values(stack).reduce((sum, v) => sum + (v ?? 0), 0);
  }

  private static elementId(element: Spell['element']): string {
    return typeof element === 'string' ? element : (element as { id: string }).id;
  }

  chooseCharacter(
    available: Character[],
    ally: Character[],
    enemy: Character[],
  ): Character {
    // First pick: take highest-tier character that fits our element strategy.
    if (ally.length === 0) {
      const sorted = [...available].sort((a, b) => {
        const tierDiff = (QwenAgent.TIERS[b.id] || 3) - (QwenAgent.TIERS[a.id] || 3);
        if (tierDiff !== 0) return tierDiff;
        // Prefer characters with primary elements in our target list.
        const aPrimary = typeof a.primary === 'string' ? a.primary : a.primary.id;
        const bPrimary = typeof b.primary === 'string' ? b.primary : b.primary.id;
        const aHasPrimary = QwenAgent.PRIMARY_ELEMENTS.includes(aPrimary) ? 1 : 0;
        const bHasPrimary = QwenAgent.PRIMARY_ELEMENTS.includes(bPrimary) ? 1 : 0;
        return bHasPrimary - aHasPrimary;
      });
      return sorted[0];
    }

    // Second/third picks: balance team composition while maintaining element synergy.
    const allyElements = new Set(ally.map(c => {
      const primary = typeof c.primary === 'string' ? c.primary : c.primary.id;
      const secondary = typeof c.secondary === 'string' ? c.secondary : c.secondary.id;
      return [primary, secondary];
    }).flat());
    
    const scored = available.map(char => {
      let score = QwenAgent.TIERS[char.id] || 3;
      const charPrimary = typeof char.primary === 'string' ? char.primary : char.primary.id;
      const charSecondary = typeof char.secondary === 'string' ? char.secondary : char.secondary.id;
      
      // Bonus for element overlap with existing allies.
      if (allyElements.has(charPrimary)) score += 2;
      if (allyElements.has(charSecondary)) score += 1;
      
      // Bonus for role diversity.
      const allyClasses = new Set(ally.map(a => a.class));
      if (!allyClasses.has(char.class)) score += 1;
      
      return { char, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].char;
  }

  chooseSpells(
    available: Spell[],
    _ally: Character[],
    _enemy: Character[],
  ): Spell[] {
    const picked = available.filter((s) =>
      QwenAgent.PREFERRED_SPELLS.includes(s.id),
    );
    const result = picked.length > 0 ? picked : available.slice(0, 5);
    this.preferredElements = result.map((s) => QwenAgent.elementId(s.element));
    return result;
  }

  chooseAction(status: MatchStatus): Action | ActionRequest {
    if (!status.canAnySourceAct || status.livingEnemies.length === 0) {
      return this.doDefend(status);
    }

    // Priority 0: Proactive defend - defend earlier to preserve board presence
    // Defend when any ally is below 60% HP (<7500) and hasn't defended yet
    const shouldDefend = status.livingAllies.find(
      (a) => a.hp < 7500 && a.canAct && !a.isDefending
    );
    if (shouldDefend) {
      return { action: 'defend', source: shouldDefend, target: shouldDefend };
    }

    // Priority 1: Try to finish low-HP enemy with spell.
    const kill = this.tryFinishingSpell(status);
    if (kill) return kill;

    // Priority 2: Try to attack with element-matching attack.
    const attack = this.tryAttack(status);
    if (attack) return attack;

    // Priority 3: Cast spell if stack is sufficient (lowered threshold to 1)
    const spell = this.tryCastSpell(status);
    if (spell) return spell;

    // Fallback: defend.
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

    const total = QwenAgent.totalStack(status.stack);
    const best = options[0];
    const affordable = total >= best.spell.stackCost;
    const finishing = target.hp <= 55;

    if (!affordable && !finishing) return null;

    return {
      action: best.spell,
      source: best.source,
      target:
        best.spell.maxTargets > 1 ? status.livingEnemies : target,
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

  private tryCastSpell(status: MatchStatus): Action | null {
    const total = QwenAgent.totalStack(status.stack);
    // Lowered threshold from 2 to 1 for more aggressive spell casting
    if (total < 1) return null;

    const options = (status.offensiveSpellOptions ?? []).filter(
      (o) => o.source.canAct && o.spell.available && total >= o.spell.stackCost,
    );
    if (options.length === 0) return null;

    // Prefer cheapest spell to maintain tempo and pressure
    options.sort((a, b) => a.spell.stackCost - b.spell.stackCost);
    const best = options[0];
    const target = status.livingEnemies[0];

    return {
      action: best.spell,
      source: best.source,
      target: best.spell.maxTargets > 1 ? status.livingEnemies : target,
    };
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
}
