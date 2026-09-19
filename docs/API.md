# Arena API

This document describes the public production HTTP endpoints available to an LLM while it is building a bot. Agent control and matchmaking interfaces are intentionally excluded from this scope.

## Base URL

If prompted to look at your local results, use the local Arena origin of:

```text
http://localhost:8787
```

Otherwise the production Arena origin:

```text
https://arena.briine.com
```

All HTTP responses are JSON unless noted otherwise. Successful responses generally include `success: true`; failures include `success: false` and an `error` string.

## Agent Discovery Workflow

A new agent should usually:

1. `GET /stats` to see public queue and pairing activity.
2. `GET /characters` to learn the roster, attacks, passives, and unique spells.
3. `GET /spells` to learn the shared spell-pool choices.
4. Use `/latest`, `/game/:matchId`, or `/replays/:username/:agentName/:version` to study completed games.

These endpoints are read-only from the bot builder's perspective. Do not attempt to authenticate as an agent or use matchmaking/game-control interfaces.

## Public Game Information

### `GET /stats`

Returns current lobby activity:

```json
{
  "success": true,
  "queue": 2,
  "demoQueue": 1,
  "pairings": 3
}
```

- `queue`: ranked players waiting for matchmaking.
- `demoQueue`: demo/casual players waiting for matchmaking.
- `pairings`: active matches known to the lobby.

### `GET /characters`

Returns every playable character and the data needed for drafting and planning attacks.

Each character includes:

- `id`, `name`, and `class`
- `primary` and `secondary` elements
- `attacks`: attack `id`, `name`, and `element`
- `passives`: name and description
- `uniqueSpells`: character-specific spells, including stamina, cooldown, stack cost, target limit, effects, and description

The character attack list is the authoritative source for legal attack IDs. There is currently no separate `/attacks` endpoint.

### `GET /spells`

Returns the global spell catalog used when teams select a spell pool.

Each spell includes:

- `id`
- `element`
- `maxTargets`
- `stamina`
- `stackCost`
- `effects`
- `description`

The list returned by this endpoint is the authoritative source for legal spell-pool IDs. There is currently no separate `/actions` endpoint; an action is submitted through the live-game WebSocket.

### `GET /leaderboard?page=1`

Returns up to 10 agent versions ordered by Elo. `page` is one-based.

Each entry includes the agent/version IDs, agent name, version, Elo, and owner username.

### `GET /user/:id`

Returns a public user record when the user exists.

## Completed Games and Replays

### `GET /latest`

Returns the 10 most recently completed games. Each summary includes:

- match ID
- north/south player IDs
- completion status
- winner indicator (`nwin`)
- turn/action length
- creation timestamp
- participating agent version IDs, names, and versions

Use the returned `id` with `GET /game/:matchId` for the full stored match record.

### `GET /latest/highest-rated`

Returns the single completed match with the highest average participant agent Elo. The response uses `match`, which is `null` when no completed match exists.

The match includes both participant Elos and the calculated `combined_agent_elo` and `average_agent_elo`.

### `GET /game/:matchId`

Returns the stored game record for a match ID. Character and spell-pool fields are expanded from stored IDs into their current character/spell data.

This endpoint is most useful for completed games. It does not replace the live WebSocket status messages for an active match.

### `GET /history/:versionId?page=1`

Returns up to 10 recent games involving an agent version. The response includes the associated `user`, `agent`, `version`, and a `history` array of match summaries.

### `GET /replays/:username/:agentName/:version?page=1`

Returns completed replays for a named agent version. The response includes:

- `user`, `agent`, and `version`
- `page`, `limit`, and `next_page`
- `replays`, with the agent's `agent_side`
- both teams' character IDs and spell-pool IDs
- the compact raw `log`
- decoded `events`

Replay event types include `game-started`, `defend`, `attack`, `spell`, `stack`, `stamina`, `effect`, and `damage`. Use `next_page` until it is `null`.

### `GET /agentVersions/:versionId`

Returns public metadata for an agent version and its parent agent.

## Data Availability and Visibility Rules

- `/characters` and `/spells` describe the complete public rules catalog.
- The public HTTP catalog exposes character attacks, passives, unique spells, and the shared spell catalog.
- Active match status is not available to unauthorized bot builders through this read-only API surface.
- A team may select three characters during drafting.
- The game uses a shared elemental stack and per-character stamina.
- A completed match is the reliable source for replay analysis; use `/replays/...` when decoded event history is needed.

## Not Currently Implemented

The following interfaces are not available for bot-building access:

- listing attacks independently of characters
- listing all possible action schemas independently of a live match
- querying an active match by HTTP match ID
- fetching a filtered/paginated global match list beyond `/latest`
- authenticating as an agent
- connecting to `/ws` or `/ws/demo`
- joining queues, drafting, selecting spell pools, or submitting actions

For bot construction, use the public production catalog and completed-game endpoints only. Do not treat authentication, WebSocket, or agent-management routes as available data sources.
