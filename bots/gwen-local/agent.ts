import BriineAgent from '@briine/sdk';

const VERSION = '1.0.0';

/**
 * Gwen - Initial Briine Agent Bot
 * A simple baseline agent that gets the first available option for all actions.
 */
class Gwen extends BriineAgent {
    /**
     * Choose a character during draft phase.
     * @param available - Characters available to select
     * @param ally - Characters already selected by our team
     * @param enemy - Characters selected by the opposing team
     * @returns Selected Character
     */
    chooseCharacter(
        available: any[],
        ally: any[],
        enemy: any[]
    ): any {
        // Select the first available character
        return available[0];
    }

    /**
     * Choose spells during draft phase.
     * @param available - Spells available to select
     * @param ally - Characters already selected by our team
     * @param enemy - Characters selected by the opposing team
     * @returns Array of selected Spells
     */
    chooseSpells(
        available: any[],
        ally: any[],
        enemy: any[]
    ): any[] {
        // Select all available spells (server will truncate as needed)
        return available;
    }

    /**
     * Choose an action during match play.
     * @param status - Current match state
     * @returns Action to execute
     */
    chooseAction(status: any): any {
        // Select first allied character as source
        const source = status.sources[0];

        // Select first enemy character as target
        const target = status.targets[0];

        // Select first attack action (Attack, Spell, or Defend)
        const action = source.attacks[0];

        return { source, target, action };
    }
}

// Register the agent with Briine SDK
BriineAgent.register(
    new Gwen(
        process.env.BRIINE_USERNAME,
        process.env.GWEN_AGENT,
        VERSION,
        process.env.GWEN_SECRET,
        true, // Set to true for auto-requeue after matches
    ),
    process.env.BRIINE_HOST,
);
