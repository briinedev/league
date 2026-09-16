// scripts/fetch-local-replays.ts
// Fetch the latest local replays for the configured Kimi version and save
// them as JSON for offline analysis. Reads environment from .env.local.

import { config } from 'dotenv';
config({ path: '../../.env.local' });

const host = process.env.BRIINE_HOST ?? 'localhost:8787';
const username = process.env.BRIINE_USERNAME ?? 'brucewrks';
const agentName = process.env.KIMI_AGENT ?? 'kimi';
const version = process.env.KIMI_VERSION ?? '0.0.1';

const origin = `http://${host}`;
const path = [origin, 'replays', encodeURIComponent(username), encodeURIComponent(agentName), encodeURIComponent(version)].join('/');
const outFile = `./data/replays-${version}.json`;

const res = await fetch(`${path}?page=1`);
if (!res.ok) {
  console.error('failed to fetch replays', res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
await Bun.write(outFile, JSON.stringify(data, null, 2));
console.log('saved', data.replays?.length ?? 0, 'replays to', outFile);
