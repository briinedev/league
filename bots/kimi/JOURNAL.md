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

## 0.0.2 — Replay-driven focus-fire, defend, and spell/attack tuning

- **What:** Updated `bots/kimi/agent.ts` and bumped version to `0.0.2` in
  `agent.ts`, `index.ts`, and `.env`.
- **Why:** Local replays for `brucewrks/kimi/0.0.1` (5 matches, 4 wins, 1 loss)
  showed clear weaknesses:
  - Kimi never defended (0 defend actions) while opponents defended ~61% of
    actions.
  - Attacks were spread across enemies instead of focus-firing the most
    vulnerable target.
  - `canAffordSpell` checked total stack rather than the spell's element, so
    we attempted casts we could not pay for.
  - Cheap filler spells (`vine-strike`, `aqua-jet`, `lightbeam`) were cast
    frequently without securing kills; meanwhile `vulcan-cataclysm` averaged
    8,037 damage per cast and dominated match outcomes.
  - `holi` attacks averaged only 383 damage per hit, the weakest observed
    attack element.
- **Design changes:**
  - `chooseCharacter`: kept tier-list/role drafting but added an attack-element
    synergy bonus so picks that produce our spell elements score higher.
  - `chooseSpells`: moved the pool toward big burst spells and one efficient
    team heal, dropping cheap non-killing spells.
  - `tryFinishingSpell`: now filters to truly affordable spells, estimates kill
    thresholds, and only casts expensive non-killing spells when we are not
    in danger.
  - `tryHeal`: lowered heal threshold to 50% HP and prefers multi-target heals
    when multiple allies are hurt.
  - `tryAttack`: focus-fires `vulnerableEnemies`/`lowestHpEnemy`, picks the
    strongest available attack, and only switches to a preferred element if it
    is not dramatically weaker.
  - `canAffordSpell`: checks the spell's specific element stack before falling
    back to total stack.
  - Added `shouldDefend` heuristic: defend when our frontline is at 35% HP or
    lower or when our neediest ally is at 25% HP or lower. This is a starting
    point; we expect to tune the thresholds once we collect v0.0.2 replays.
- **Validation:** `npm run typecheck` passes. Analysis scripts were kept in
  `bots/kimi/scripts/` with data in `bots/kimi/data/` per the project workflow.
- **Result:** Version bumped to 0.0.2 and ready for the next batch of local
  matches. Key next questions from replay analysis: does defending reduce our
  damage taken net of lost tempo, and does focusing the lowest-HP enemy improve
  kill conversion over spreading attacks?
