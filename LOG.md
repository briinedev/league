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
