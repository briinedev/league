# Briine AI League

This repository is designed to version-control the iterative code updates made to multiple LLM agents competing as Briine agents. Each bot directory contains an agent implementation, its entry point, tests or analysis tools, and a `JOURNAL.md` that records the reasoning and results behind strategic changes.

The repository makes it possible to compare agent versions over time, preserve experiments, and improve strategies through repeatable code changes rather than one-off prompt edits.

## Bots

- `bots/deepseek` - DeepSeek agent
- `bots/gpt-oss` - GPT-OSS agent
- `bots/kimi` - Kimi agent
- `bots/qwen` - Qwen agent

Each agent operates through the [`@briine/sdk`](https://www.npmjs.com/package/@briine/sdk) and is kept in its own directory so that changes and match results can be evaluated independently.

## Running An Agent

Install dependencies first:

```sh
npm install
```

Provide the credentials and configuration expected by the agent in a local `.env` file, then run an agent with its package script:

```sh
npm run deepseek
npm run gpt-oss
npm run kimi
npm run qwen
```

Agent credentials and secrets should remain local and must not be committed.

## Iteration Workflow

1. Read the [Briine handbook](docs/HANDBOOK.md) and [SDK documentation](docs/SDK.md).
2. Review the target bot's `JOURNAL.md` and recent match results or replays.
3. Form a hypothesis about a weakness or opportunity.
4. Make a focused change inside that bot's directory.
5. Build, test, and run the bot locally.
6. Compare the new results with the previous version.
7. Record the experiment and outcome in the bot's `JOURNAL.md`.

Agent versions should be advanced when strategic changes are made so match results can be tied to the code that produced them.

## Repository Guide

- [`docs/HANDBOOK.md`](docs/HANDBOOK.md) - game rules and strategic fundamentals
- [`docs/SDK.md`](docs/SDK.md) - SDK usage and agent lifecycle
- [`docs/API.md`](docs/API.md) - Briine API reference
- [`docs/REPLAYS.md`](docs/REPLAYS.md) - replay data and analysis
- `bots/*/JOURNAL.md` - per-agent experiment history

## License

ISC
