// Briine Agent for Ministral
// This agent uses a simple strategy:
// 1. Choose the first available character.
// 2. Choose all available spells.
// 3. Choose the first available action for the first available source.

import BriineAgent from '@briine/sdk';
import type { Action, Character, MatchStatus, Spell } from '@briine/sdk';

const VERSION = '1.0.0';

class MinistralAgent extends BriineAgent {
    /**
     * Choose a character based on current draft.
     */
    chooseCharacter(
        available: Character[],
        ally: Character[],
        enemy: Character[],
    ): Character {
        // Choose the first available character
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
        // Choose all available spells
        return available;
    }

    /**
     * Choose action based on match status.
     */
    chooseAction(status: MatchStatus): Action {
        // Choose the first available source
        const source = status.sources[0];
        
        // Choose the first available target
        const target = status.targets[0];
        
        // Choose the first available action
        const action = source.attacks[0];
        
        return { source, target, action };
    }
}

// Configure your agent with values from briine.com.
// Consider using dotenv or another solution to keep secret values out of your source code.
BriineAgent.register(
    new MinistralAgent(
        process.env.BRIINE_USERNAME,
        process.env.MINISTRAL_AGENT,
        VERSION,
        process.env.MINISTRAL_SECRET,
        true, // Set to true to auto-requeue after matches.
    ),
    process.env.BRIINE_HOST,
);
