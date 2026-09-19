# Qwen Journal

## 0.0.3 — Proactive defend + aggressive spells

- **What:** Major strategic overhaul based on comprehensive v0.0.1 replay analysis (3W-3L, 50% WR).
- **Why:** Deep analysis of 6 matches revealed critical issues:
  - Zero defends in 4/6 matches - defend threshold (<40%) was too conservative
  - Spell usage strongly correlates with wins: wins averaged 22.8 casts, losses averaged 10.3 casts
  - Damage ratio critical: losses took 4x more damage than dealt (16913 vs 4029)
  - Key insight: Need proactive defending to preserve board presence and maintain offensive pressure
- **Changes:**
  - **Proactive Defending**: Changed defend threshold from <40% HP (<5000) to <60% HP (<7500)
  - **Aggressive Spell Casting**: Lowered spell threshold from stack≥2 to stack≥1 for tempo
  - **Spell Rotation**: Prioritize cheapest effective spells to maintain constant pressure
  - **Tier List Refinement**:
    - Elevated: Bastion (stability), Vulcan (burst), Morvain (damage), Lupercus (versatile)
    - Lowered: Tiderend, Aquaelia, Lumina (died early in losses)
  - **Better Finish Detection**: Improved identification of low-HP execution opportunities
- **Validation**: TypeScript type-check passes, agent starts successfully
- **Expected**: 
  - Higher defend frequency (target 2-3 per match vs 0-1 previously)
  - Increased spell casts in losses (target 18-22 vs previous 10-12)
  - Better damage ratio through preserved board presence
  - Win rate improvement from 50% to 60%+

## 0.0.2 — Defend logic + spell diversity

- **What:** Added defensive behavior and expanded spell options based on replay analysis.
- **Why:** Analysis of v0.0.1 matches (4W-1L, 80% WR) revealed:
  - Zero defend actions across all matches - need to defend when HP is low
  - Limited spell diversity - only 7 different spells used
  - Character tier ratings could be improved based on actual performance
- **Changes:**
  - **Defend Logic**: Added priority check for allies <40% HP to defend immediately
  - **Spell Pool**: Added cheap 3-cost spells (`ember-bolt`, `wind-cut`, `thunder-shock`, `predator-rush`) for better spam potential
  - **Tier List**: Elevated `lupercus` to 5, `veneos` and `seraphis` to 4 based on match performance
  - **Version**: Updated from 0.0.1 to 0.0.2
- **Validation**: TypeScript type-check passes, agent starts successfully
- **Expected**: Improved survivability through timely defends, more spell variety, better draft consistency

## 0.0.1 — Initial agent

- **What:** Created the first version of the Qwen bot at `bots/qwen`.
- **Why:** Baseline competitive agent built from the Briine HANDBOOK, SDK docs,
  and the public character/spell catalogs at `/characters` and `/spells`.
- **Design:**
  - Draft: tier-list scoring with element concentration strategy, prioritizing
    characters that share fire/light/shadow elements for efficient stack conversion.
  - Spell pool: biased toward cheap damage spells (cost ≤3 stack) in team elements,
    plus `healing-light` and `cleanse` for utility flexibility.
  - Action priority: execute low-HP enemies with finishing spells, build stack
    with element-matching attacks, cast spells at efficient thresholds, defend
    to preserve stamina when needed.
  - Element synergy: bonuses for drafting characters whose elements overlap with
    existing allies and preferred spell pool.
- **Validation:** TypeScript type-check passes (`npm run typecheck`) and basic
  smoke test confirms draft, spell selection, attack, and defend behavior.
- **Result:** Baseline ready for matches. Future iterations should compare
  replay results against this version and adjust tier list, spell preferences,
  and action heuristics based on actual performance data.
