## Iteration 0.0.2

**Findings**
- Fetched the latest replay for version `0.0.1` of the agent from the local arena (`http://localhost:8787`).
- The replay log shows a recurring pattern where the same character (`6`) repeatedly attacks with the `holi` ability, dealing large damage while our agent never attacks.
- Stamina gains and stack gains are frequent but our agent never spends stack because it never casts spells.

**Changes**
- Bumped the agent version to **0.0.2**.
- Updated the constructor to pass the new version string.
- No behavioural change yet – this iteration records observations for the next improvement step.

**Next steps**
1. Implement simple stack‑spending logic: when a source has enough stack, cast a spell instead of attacking.
2. Prefer characters that generate stack (e.g., those with attacks that add stack) when selecting a source.
3. Add logging of damage taken to detect over‑exposure.
