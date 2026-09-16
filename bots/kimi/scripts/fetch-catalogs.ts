// scripts/fetch-catalogs.ts
// Save local character and spell catalogs for reference during strategy work.

import { config } from 'dotenv';
config({ path: '../../.env.local' });

const host = process.env.BRIINE_HOST ?? 'localhost:8787';
const origin = `http://${host}`;

async function save(endpoint: string, file: string) {
  const res = await fetch(`${origin}/${endpoint}`);
  if (!res.ok) {
    console.error('failed', endpoint, res.status, await res.text());
    return;
  }
  const data = await res.json();
  await Bun.write(file, JSON.stringify(data, null, 2));
  console.log('saved', endpoint, 'to', file);
}

await save('characters', './data/characters.json');
await save('spells', './data/spells.json');
