import BriineAgent from '@briine/sdk';
import type { Action, Character, MatchStatus, Spell } from '@briine/sdk';

/**
 * Competitive agent for the Briine coding challenge (version 0.0.1).
 *
 * Draft:   select the first available character.
 * Spells:   take a small prefix of the offered spells – the server will trim to the allowed size.
 * Action:  attack with the first source that has stamina; otherwise defend (fallback to the first attack).
 *
 * All configuration (username, agent name, secret) is read from environment variables so the same code works in CI.
 */
export default class GptOssAgent extends BriineAgent {
    // ---------------------------------------------------------------------
    // Draft phase
    // ---------------------------------------------------------------------
    chooseCharacter(available: Character[], _ally: Character[], _enemy: Character[]): Character {
        return available[0];
    }

    chooseSpells(available: Spell[], _ally: Character[], _enemy: Character[]): Spell[] {
        return available.slice(0, 5);
    }

    // ---------------------------------------------------------------------
    // Action phase
    // ---------------------------------------------------------------------
    chooseAction(status: MatchStatus): Action {
        const source =
            status.sources.find(s => s.attacks.some(a => (a as any).stamina > 0)) ||
            status.sources[0];

        const canAttack = source.attacks.some(a => (a as any).stamina > 0);
        const target = status.targets[0];

        if (canAttack) {
            const attack = source.attacks.find(a => (a as any).stamina > 0) || source.attacks[0];
            return { source, target, action: attack } as Action;
        }

        // No stamina, defend (fallback to first attack as a no‑op).
        const action = source.attacks[0];
        return { source, target, action } as Action;
    }
}

// Register the agent when this module is imported.
BriineAgent.register(
        new GptOssAgent(
            process.env.BRIINE_USERNAME as string,
            process.env.GPT_OSS_AGENT as string,
            '0.0.2', // bumped after iterative improvement
        process.env.GPT_OSS_SECRET as string,
        true,
    ),
    process.env.BRIINE_HOST as string
);
