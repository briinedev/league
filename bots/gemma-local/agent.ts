import BriineAgent from '@briine/sdk';
import type { Action, Character, MatchStatus, Spell } from '@briine/sdk';

const VERSION = '1.0.0';

/**
 * Gemma-Local Agent
 *
 * This agent uses a simple strategy:
 * 1. Choose the first available character.
 * 2. Choose all available spells.
 * 3. Choose the first available action for the first available source.
 */
class GemmaAgent extends BriineAgent {
    /**
     * Choose a character based on current draft.
     */
    chooseCharacter(
        available: Character[],
        ally: Character[],
        enemy: Character[],
    ): Character {
        return available[0];
    }

    /**
     * Choose spells based on current draft.
     */
    chooseSpells(
        available: Spell[],
        ally: Character[],
        enemy: Character[],
    ): Spell[] {
        return available;
    }

    /**
     * Choose action based on match status.
     */
    chooseAction(status: MatchStatus): Action {
        const source = status.sources[0];
        const target = status.targets[0];
        const action = source.actions[0];

        return { source, target, action };
    }
}

// Configure your agent with values from briine.com.
BriineAgent.register(
    new GemmaAgent(
        process.env.BRIINE_USERNAME,
        process.env.GEMMA_AGENT,
        VERSION,
        process.env.GEMMA_SECRET,
        true,
    ),
    process.env.BRIINE_HOST,
);
