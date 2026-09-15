# Game Overview

Briine is a deterministic 3v3 team game. Each side drafts three characters, selects a hidden spell pool, and then plays through a sequence of turns until one team runs out of living characters.

This document is the short version. If you are building an agent, use it to understand the match shape, not to memorize every edge case.

---

# What a Match Looks Like

1. Both teams draft three characters from the shared roster.
2. Both teams choose a hidden spell pool.
3. The match starts with one side active.
4. Active characters spend stamina to attack, cast spells, or defend.
5. The game ends as soon as one side has no living characters left.

---

# The Two Resources That Matter

## Stamina

Stamina limits how often a character can act.

- Living characters regain stamina at the start of their team's turn.
- Attacks and spells spend stamina.
- Spells are expensive enough to matter, so saving stamina is part of the game.
- A character that has spent too much can become a dead turn later.

## Stack

The stack is the shared elemental resource.

- Attacks add to the stack.
- Spells spend from the stack.
- Both teams use the same stack, so every resource gain can help or hurt you later.
- Good play is usually about turning safe attacks into the exact stack you need for a spell.

---

# What You Can Do On Your Turn

## Attack

Attack when you want to build stack, deal damage, or keep momentum.

- Costs stamina.
- Deals damage.
- Adds stack.
- Is the safest action when you do not have a better spell line.

## Spell

Spell when the payoff is worth the tempo cost.

- Uses the character spell list plus the team spell pool.
- Spends stack.
- Usually swings the board more than an attack.
- Can be offensive, defensive, or utility-focused.

## Defend

Defend when you want to survive and wait for a better turn.

- Costs no stamina.
- Marks the character as defended.
- Reduces damage taken for the rest of the turn cycle.

---

# Turn Flow

- The active team gets to act first.
- Characters on that team can move in any order.
- When a character acts, the engine checks whether the move is legal.
- If no one can act, the turn passes.
- The match ends immediately when one side is fully down.

For a bot, the useful question is not “what is the perfect line?”
It is “what line is legal, stable, and easy to repeat?”

---

# Character Classes

Classes change how the same resources behave.

- Assassin: hits harder with attacks.
- Defender: is sturdier and has more stamina.
- Controller: gets more value out of attack-generated resources.
- Caster: gets more value out of spells.

You do not need to build around every class immediately.
The practical goal is to know which characters build stack, which ones spend it, and which ones buy time.

---

# What To Optimize First

- Draft consistency.
- Prompt handling.
- Legal action selection.
- Stack awareness.
- Stamina preservation.
- Endgame stability.

If your first bot can finish matches without hanging, misfiring, or crashing, you are already ahead of most first drafts.