# DeepSeek Journal

## 0.0.1 — Initial agent

- **What:** Created the first version of the DeepSeek bot from scratch at
  `bots/deepseek`.
- **Why:** Baseline competitive agent built from the HANDBOOK and SDK docs plus
  the public character/spell catalog.
- **Design:**
  - Draft: tier-list scoring with role coverage (defender + assassin + carry) so
    teams are never missing a critical role.
  - Spell pool: biased toward cheap single-target damage plus a sustain spell to
    make built stack convertible into results.
  - Action priority: secure kills on low-HP enemies, sustain fragile allies,
    press the element we most need to build, then defend to conserve stamina.
- **Result:** No matches run yet. Baseline for future iteration.

## Runtime configuration

- **What:** Removed the runtime environment dump and made DeepSeek-specific
  configuration fall back to shared `BRIINE_*` bindings.
- **Why:** Cloudflare Workers and local npm launches should provide credentials
  through runtime environment bindings without printing secrets to logs.
- **Result:** `npm run deepseek` accepts either `DEEPSEEK_*` or `BRIINE_*`
  configuration, with no dotenv or shell-wrapper dependency.

---

## 0.0.2 — Stack-focused iteration

- **What:** Rewrote the action strategy based on replay analysis of v0.0.1.
- **Why:** Replays showed 3W/2L (elo 400 -> 432) with clear inefficiencies:
  the bot over-spammed `holi` (light) attacks (696 vs 134 `flst`), rarely cast
  impactful spells, and never defended.
- **Findings from replays:**
  - Wins strongly correlated with casting `vulcan-cataclysm` (~12k+ burst). The
    red-consuming engine is the primary win condition and was under-used.
  - The v0.0.1 spell pool was scattered across many elements, so no single
    element stack built up enough to cast costly spells reliably.
  - Zero defends across all matches -> stamina burn-out led to long attrition
    losses (one match went 832 actions).
- **Changes:**
  - Narrowed the hidden spell pool to cheap red/blue/orange/green damage
    (`flame-bolt`, `aqua-jet`, `stone-fist`, `vine-strike`, etc.), dropping the
    scattered support spells.
  - Added a dedicated `tryCataclysm` trigger: cast `vulcan-cataclysm` whenever
    red stack >= 12, focused on the lowest/only enemy.
  - Attack selection now prioritizes red > blue > light to actually build the
    win-engine stack instead of defaulting to `holi`.
  - Added stamina management: sources below 2 stamina defend instead of wasting
    a weak attack.
- **Result:** Type-checks cleanly; smoke-tested that (a) cataclysm fires with
  red >= 12, (b) red attack preferred otherwise, (c) low-stamina sources defend.
  Bumped version to `0.0.2` for a new test pass.

---

## 0.0.3 — Win-engine hardening (replay-driven)

- **What:** Analyzed 6 production replays of v0.0.2 (4W/2L, elo 427) via
  `GET https://arena.briine.com/replays/briine-league/deepseek/0.0.2?page=1`.
  Fixed three weaknesses that were throttling the primary win condition.
- **Facts:**
  - Per-character attack element is fixed at draft time: bastion/seraphis/lumina
    only ever attack `holi` (light), vulcan only `flst` (red), lupercus only
    `wnct` (green). Attack element is 100% decided by the draft.
  - `vulcan-cataclysm` is the clear win engine, but v0.0.2 fired it on a
    **single target even when multiple enemies were alive** (win `75e02` shows
    `1,2,3` early then later `:1`), wasting its 3-target burst (~3k per target).
  - The only loss without a vulcan draft (`c2f24`, bastion+lupercus+seraphis)
    had **zero red attacks** and no red-fuel win condition at all.
  - `flame-bolt` (red, 8 stack) competed with the cataclysm engine that needs
    red >= 12, slowing the engine with non-killing red dumps.
- **Changes:**
  - `tryCataclysm`: pass the full `status.livingEnemies` array whenever the spell
    supports multi-target and >1 enemy stands, maxing the burst.
  - Draft bias: `vulcan` gets an extra +4 so the only reliable red attacker /
    engine owner is picked even when a defender is also needed.
  - `tryKillSpell`: guard against dumping red into a non-killing `flame-bolt`
    (>=8 cost, target hp > 50); fall back to a cheaper non-red spell instead.
    Red spells are still spent freely on a legitimate finishing blow.
- **Result:** `npm run typecheck` clean; smoke tests confirm (a) cataclysm hits
  2 targets when 2 live, (b) red flame-bolt is avoided on a non-kill in favor of
  a cheaper spell, (c) red flame-bolt is used on a finishing blow. Bumped
  version to `0.0.3` for a new test pass.
