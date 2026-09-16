# Qwen Journal

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
