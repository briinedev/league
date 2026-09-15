# Gwen Bot

Initial Briine Agent implementation using the @briine/sdk.

## Files

- `agent.ts` - Main agent implementation extending `BriineAgent`
- `tsconfig.json` - TypeScript configuration for this bot

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Update the secret in `agent.ts`:
   - Replace `'agent-secret'` with your actual secret from briine.com

3. Build the bot:
   ```sh
   npx tsc
   ```

## Implementation Strategy

This is a baseline agent that:
- Selects the first available character during draft
- Selects all available spells (truncated by server)
- Performs attacks on the first enemy target

## License

ISC
