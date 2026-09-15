# Qwen Journal

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
