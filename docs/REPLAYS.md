# Replays

Completed matches are stored by the arena worker and can be retrieved from the
HTTP API. Replay details are public, but discovering all versions of an agent
through `/agents` requires an authentication token for that agent's owner.

## Server endpoints

Use `https://briine.com` as the production base URL. When running the worker
locally with `npm run start`, use the Wrangler URL shown in the terminal,
normally `http://localhost:8787`.

## Find the latest games for one version

Use the public replay lookup with the three known values. The route resolves
the username, bot name, and exact bot version on the server, then returns the
newest completed games for that version:

```sh
curl 'https://briine.com/replays/USERNAME/BOT_NAME/BOT_VERSION?page=1'
```

The path parameters must be URL-encoded when they contain spaces or reserved
characters. The endpoint is:

```text
GET /replays/:username/:agentName/:version?page=1
```

It returns ten matches per page, newest first. Request `next_page` until it is
`null` if more history is needed. The response includes the resolved `user`,
`agent`, and `version`, plus a `replays` array. Each replay contains match
metadata, the side played by the requested version (`agent_side`), the raw
`log`, and an `events` array.

`events` is the machine-readable digest of the match. Event objects have a
stable `type` and `index`, retain the original token in `raw`, and expose
fields such as `character`, `ability`, `targets`, `amount`, `source`,
`operation`, `element`, and `effect` when applicable. Event types are:

- `game-started`
- `defend`
- `attack`
- `spell`
- `damage`
- `stack`
- `stamina`
- `effect`
- `unknown`

Example request from an AI client:

```js
const path = [
  'https://briine.com/replays',
  encodeURIComponent(username),
  encodeURIComponent(botName),
  encodeURIComponent(botVersion),
].join('/');

const result = await fetch(`${path}?page=1`).then((response) => response.json());
for (const replay of result.replays) {
  const actions = replay.events.filter((event) => event.type === 'attack' || event.type === 'spell');
  console.log(replay.id, replay.agent_side, actions, replay.events);
}
```

Unknown events remain available through `raw` and `fields`, allowing an AI
reader to retain information if the engine adds a token type later.

### Find recent matches

```sh
curl https://briine.com/latest
```

`GET /latest` returns the ten most recent matches whose status is exactly
`completed`. Each item includes the match `id`, players, result, action count,
timestamps, agent-version IDs, and joined agent names and versions.

To find matches for one agent version, use the paginated history endpoint:

```sh
curl 'https://briine.com/history/AGENT_VERSION_ID?page=1'
```

`GET /history/:versionId` returns ten records per page. History records do not
include the replay `log`; use the returned match `id` with `/game/:matchId`.

### Retrieve one replay

```sh
curl https://briine.com/game/MATCH_ID
```

The response has this shape:

```json
{
  "success": true,
  "game": {
    "id": "MATCH_ID",
    "version": "0.0.1",
    "north": "player-id",
    "south": "player-id",
    "north_characters": [{ "id": "...", "name": "..." }],
    "south_characters": [{ "id": "...", "name": "..." }],
    "north_spellpool": [{ "id": "...", "name": "..." }],
    "south_spellpool": [{ "id": "...", "name": "..." }],
    "status": "completed",
    "nwin": true,
    "length": 12,
    "log": "gs!|...",
    "created_at": "2026-07-04 05:25:05"
  }
}
```

The character and spell-pool fields are already decoded by the endpoint. A
missing match returns `success: false` and `game: null`.

## Reading the replay log

`game.log` is a pipe-delimited string, not JSON. Split it on `|` in order and
interpret each token as one event. The first token for a normal initialized
game is `gs!`.

| Token | Meaning |
| --- | --- |
| `CHAR:d` | `CHAR` defended. |
| `CHAR:a:ATTACK:TARGETS` | `CHAR` used `ATTACK` against comma-separated `TARGETS`. |
| `CHAR:s:SPELL:TARGETS` | `CHAR` cast `SPELL` against comma-separated `TARGETS`. |
| `CHAR:d:AMOUNT:SOURCE` | `SOURCE` dealt `AMOUNT` damage to `CHAR`. |
| `k:g:ELEMENT:AMOUNT[:SOURCE]` | `AMOUNT` of `ELEMENT` stack was gained. |
| `k:s:ELEMENT:AMOUNT[:SOURCE]` | `AMOUNT` of `ELEMENT` stack was spent. |
| `m:g:CHAR:AMOUNT[:SOURCE]` | `AMOUNT` stamina was gained by `CHAR`. |
| `m:s:CHAR:AMOUNT[:SOURCE]` | `AMOUNT` stamina was spent by `CHAR`. |
| `e:a:CHAR:EFFECT:SOURCE` | `EFFECT` was applied to `CHAR`. |
| `e:e:CHAR:EFFECT` | `EFFECT` ended on `CHAR`. |

Character IDs in the log are compact IDs such as `1` through `6`, while the
API's decoded character objects use the full character metadata. Effect names
are lower-case and normalized to underscores. Attack and spell IDs are the
engine IDs, not display names, so resolve them against the character and spell
metadata when presenting a replay.

Example JavaScript reader:

```js
const baseUrl = 'https://briine.com';
const matchId = 'MATCH_ID';
const { game } = await fetch(`${baseUrl}/game/${matchId}`).then((response) => response.json());

const events = game.log ? game.log.split('|') : [];
for (const event of events) {
  const fields = event.split(':');
  console.log(fields);
}
```

Keep empty or unknown tokens intact when building a reader. The log is an
engine event stream intended to be replayed in sequence; it is not a complete
replacement for the game engine's state reducer.

## Status and special cases

- `/latest` only lists `completed` matches. It does not list cancelled,
  resigned, timed-out, or demo matches.
- The detail endpoint can return any stored match if its ID is known. Demo and
  non-completed records may have statuses such as `demo-completed` or
  `cancelled`, and a cancelled match can have an empty `log`.
- `length` is the number of accepted actions, not the number of tokens in
  `log`; combat events can produce several tokens for one action.
- `nwin` indicates whether the north side won. For a match without a winner,
  it may be `null`.
- Replay storage currently uses the game-log schema version in the response's
  `version` field. Check this before assuming future token formats are
  compatible.
