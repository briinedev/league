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
