# Agent Log

This file accurately logs the inputs that were necessary to generate the code for each Briine Agent's.

Agent output is truncated based on human input so as not to include personal filesystem information, human setup requiresments, etc. This is simply a lot of information that the LLMs provide.

## V 1.0.0 | 09/14/2026

**All agents prompted through VS Code's Harness**

Using only open models through Ollama for this version. Every model is given a nearly-identical prompt, different only in its working directory.

Prompts are truncated to only include information related to what the agents accomplished, not including any actionable items.

---

### deepseek-v4-flash:cloud - `bots/deepseek`

Prompt:

> Using all available docs and API information, create a competitive Agent for Briine.com's agentic coding challenge at bots/deepseek. Start with version 0.0.1, but otherwise use variables from the environment for setup see .env for details.

Response (10m 29s):

**Timeout.**

Prompt:

> Continue

Response (27s)

> I've created a competitive DeepSeek agent for Briine. Here's what was built:

> Files created in deepseek
> agent.ts — DeepSeekAgent class extending the SDK's BriineAgent
> index.ts — entry point that reads config from environment variables and registers the agent
> tsconfig.json / package.json — type-check + run tooling
> JOURNAL.md — strategy notes for the 0.0.1 version
> The agent (v0.0.1)
> Drafting — tier-list scoring plus role coverage so the team always lands a defender (Bastion/Seraphis/etc.), an assassin finisher (Vulcan/Veneos), and a carry, while denying strong picks from the enemy.
> Spell pool — biased toward cheap single-target damage (stone-fist, vine-strike at 5 stack) with a sustain spell, so built stack converts into results quickly.
> Action priority — secure kills on low-HP enemies, sustain fragile allies (hp <= 45), then pressure the element your spell pool needs most, and finally defend to preserve stamina for later turns.

### gpt-oss:120b-cloud - `bots/gpt-oss`

Prompt:

> Using all available docs and API information, create a competitive Agent for Briine.com's agentic coding challenge at bots/gpt-oss. Start with version 0.0.1, but otherwise use variables from the environment for setup see .env for details.

Response (6s):

> I have reviewed the SDK example, the handbook, and the API documentation. I will now create a new competitive agent in the directory bots/gpt-oss with version 0.0.1 and register it using environment variables (username, secret, etc.) as described in the prompt. This will give you a ready‑to‑run bot that follows the required interface and can be built and tested immediately.

Prompt:

> Okay, continue.

Response (52s):

> Implemented a competitive Briine agent in index.ts with:

> Environment‑driven configuration (username, agent name, secret)
> Simple deterministic strategies for drafting, spell selection, and action choice
> Automatic registration on import
> Added a basic test suite agent.test.ts to verify core methods. The agent is ready to be built, tested, and run.

---

### qwen3.5:397b-cloud - `bots/qwen`

Prompt:

> Using all available docs and API information, create a competitive Agent for Briine.com's agentic coding challenge at bots/qwen. Start with version 0.0.1, but otherwise use variables from the environment for setup see .env for details.

Response (4m 7s):

> Perfect! Everything passes. Now let me create a comprehensive summary document for the user:

> Summary
> I've successfully created a competitive Briine agent at qwen (version 0.0.1). Here's what was built:

> ... (file structure information)

> 🎯 Competitive Strategy
> Character Draft:

> - Element concentration approach focusing on fire/light/shadow synergy
> - Tier-list based scoring (bastion, vulcan, morvain rated highest)
> - Balances element overlap with role diversity
> Spell Pool:
> - Prioritizes cheap, efficient damage spells (≤3 stack cost)
> - Includes `flame-bolt`, `stone-fist`, `shadow-spike`, `lightbeam`, etc.
> Adds utility with `healing-light` and `cleanse`
> Action Priority:
> 1. Execute low-HP enemies with finishing spells
> 2. Build stack with element-matching attacks
> 3. Cast damage spells at efficient thresholds
> 4. Defend to preserve stamina
> ✅ Validation
> - ✅ TypeScript typecheck passes
> - ✅ All 4 unit tests pass
> - ✅ Agent starts correctly with proper env validation

---

### kimi-k2.7-code:cloud - `bots/kimi`

Prompt:

> Using all available docs and API information, create a competitive Agent for Briine.com's agentic coding challenge at bots/kimi. Start with version 0.0.1, but otherwise use variables from the environment for setup see .env for details.

Response (3s):

> Jest isn't installed; I'll cancel the prompt and test with the project's existing tools instead.

Response (51s):

> Created the competitive Kimi bot at kimi (version 0.0.1).

> Files added:

> agent.ts — KimiAgent with tier-list drafting, role coverage, cheap-damage spell-pool selection, and an action priority of kill → heal → build-stack attack → defend.
> index.ts — entry point that reads KIMI_* environment variables (falling back to BRIINE_*) and registers the agent.
> package.json and tsconfig.json — matching the other bots’ setup.
> JOURNAL.md — initial design note.
> agent.test.ts — basic behavior tests.


## V 1.0.1 | 09/15/26

Agents continue to be prompted through VS Code's harness.

All agents were prompted with the prompt in `prompts/ITERATE.md`, with `[DIRECTORY]` replaced with their bot's specified directory.

Previous results:

```
qwen: 4 win 1 loss
kimi: 4 win 1 loss
deepseek: 3 win 2 loss
gpt-oss: 1 win 4 loss
```

### deepseek-v4-flash:cloud - `bots/deepseek`

`+291 -57` in 5m 51s

> Iteration summary: DeepSeek v0.0.1 → v0.0.2
> 1. Retrieved & analyzed replays (local localhost:8787)
> Pulled the bot's 5 recorded matches (3W / 2L, elo 400→432) and parsed the raw logs per REPLAYS.md with a small analyzer (analyze.py).
> 2. Key findings
> Over-spammed light (holi): 696 holi attacks vs only 134 flst (red), with attacks never aligned to a win engine.
> Under-used the winning spell: Wins correlated tightly with casting vulcan-cataclysm (~12k burst), but it fired only 10 times in 5 matches.
> Zero defends: stamina burned out, causing long attrition losses (one match ran 832 actions).
> 3. Changes in agent.ts
> Focused spell pool on cheap red/blue/orange/green damage (flame-bolt, aqua-jet, stone-fist, vine-strike, etc.), dropping the scattered support spells that diluted stack.
> Added tryCataclysm: casts vulcan-cataclysm whenever red stack ≥ 12, focused on the lowest/only enemy (and only when off cooldown/available).
> Win-engine attack priority: prefer red > blue > light attacks to actually build the stack the engine needs.
> Stamina management: sources with < 2 stamina defend instead of wasting a weak attack.

**Observations:** Deepseek was already a top contender, and spent a fair amount of time writing a python parser for the replays and determining what its weaknesses may be. Moderate code updates in a reasonable amount of time.

### gpt-oss:120b-cloud - `bots/gpt-oss`

`+39 -6` in 26s

> Implemented the competitive agent gpt-oss with a deterministic draft, spell selection, and action strategy. Added environment‑driven registration and bumped the version to 0.0.2. Created a JOURNAL.md entry documenting replay observations, the version bump, and next steps for iterative improvement. The agent is now ready for further tuning and testing.

**Observations:** GPT-OSS had a fairly poor showing, but seems to be playing the long-game. It found an immediate issue that is likely to be the immediate reason for its poor performance, and seems to be waiting until next round to continue iterating.

### qwen3.5:397b-cloud - `bots/qwen`

`+567 -7` in 6m 5s

> Summary
> I've successfully iterated on the Qwen agent from v0.0.1 to v0.0.2 based on comprehensive match replay analysis. Here's what was accomplished:
>
> 📊 Match Analysis Results (v0.0.1)
> Record: 4W - 1L (80% win rate) - Strong baseline!
> Draft Performance:
> Bastion+Morvain+Vulcan: 3W-1L (75% WR)
> Bastion+Lupercus+Veneos: 1W-0L (100% WR)
> Key Issues Identified:
> ❌ Zero defend actions across all 5 matches
> ❌ Limited spell diversity - only 7 different spells used
> ❌ Underutilized character pool - lupercus/veneos performing well but rated lower
> 🚀 Improvements in v0.0.2
> 1. Defend Logic Added
> 2. Enhanced Spell Pool
> Added 4 new cheap spells for better spam potential:
> ember-bolt (Fire, 3 stack)
> wind-cut (Nature, 3 stack)
> thunder-shock (Yellow, 3 stack)
> predator-rush (Green, 5 stack, multi-target)
> 3. Updated Character Tier List
> Based on actual match performance:
> lupercus: 4 → 5 (proven performer)
> veneos: 4 (maintained, strong showing)
> seraphis: 3 → 4 (elevated for utility)
> lumina: 4 → 3 (adjusted based on usage)

**Observations:** Qwen makes small changes to the internals of its agent, which makes sense as it was a top condender already. Seems to focus on hardening tests and writing comments. Qwen, alongside Deepseek, wrote a python analysis tool as well.

### kimi-k2.7-code:cloud - `bots/kimi`

Kimi's prompt had to be appended with the following:

> Please keep any scripts that you're using to access the api and/or analyze your matches within your bot's directory.

`+740 -8` in 24m 28s

> Kimi v0.0.2 is ready.
>
> Changes made:
>
> agent.ts: revised strategy — better draft synergy, burst-focused spell pool, focus-fire targeting, defend heuristic, and element-specific canAffordSpell.
> index.ts: version fallback bumped to 0.0.2.
> package.json: start script now reads from ../../.env.
> .env: added KIMI_VERSION=0.0.2.
> JOURNAL.md: added v0.0.2 replay-driven iteration entry.
> analyze-replays.ts: fixed JSON import to with { type: 'json' } for NodeNext compatibility.

**Observations:** Kimi spent a large amount of time writing multiple iterations of various javascript helpers within the `/tmp` directory, and seems to be hyper-fixated on understanding(?) the internals of the replay and game logic. This wasted a LOT of tokens, as can be seen by the time spent executing all of this. Adding the request to keep scripts within the agent's directory seemed to stop the looping, and updates to the implementation quickly followed afterward. Kimi already had a competitive agent, 
