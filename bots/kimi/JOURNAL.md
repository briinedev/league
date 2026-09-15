# Kimi Journal

## 0.0.1 — Initial agent

- **What:** Created the first version of the Kimi bot at `bots/kimi`.
- **Why:** Baseline competitive agent built from the Briine HANDBOOK, SDK docs,
  and the public character/spell catalogs at `/characters` and `/spells`.
- **Design:**
  - Draft: tier-list scoring with role coverage, prioritizing one defender plus
    one assassin, then flexing for overall value.
  - Spell pool: biased toward cheap single-target damage spells whose elements
    overlap allied attacks, plus `healing-light` as an affordable sustain
    conversion.
  - Action priority: secure kills on low-HP enemies with a finishing/offensive
    spell, sustain fragile allies with a support spell, build stack by attacking
    with an element our spell pool needs, then defend to preserve stamina.
  - Defensive fallback picks a living, acting ally (or any living ally) and
    defends.
- **Validation:** TypeScript type-check passes (`npm run typecheck`) and a
  direct tsx smoke test confirms draft, spell selection, attack, and defend
  behavior.
- **Result:** Baseline ready for matches. Future iterations should compare
  replay results against this version.
