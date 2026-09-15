import BriineAgent from '@briine/sdk';
import KimiAgent from './agent.ts';

/**
 * Entry point for the Kimi bot.
 *
 * Configuration is read from the environment (see .env.local for the expected
 * keys) so credentials stay out of source control:
 *   KIMI_USERNAME   (or BRIINE_USERNAME)
 *   KIMI_HOST       (or BRIINE_HOST)
 *   KIMI_AGENT      agent/bot name
 *   KIMI_SECRET     agent secret
 *   KIMI_VERSION    agent version, e.g. "0.0.1"
 *   KIMI_STAY_QUEUED  set "true" to auto-requeue after matches
 */

const VERSION = '0.0.1';

const env = process.env;

const username = env.BRIINE_USERNAME || '';
const host = env.KIMI_HOST || env.BRIINE_HOST || '';
const agentName = env.KIMI_AGENT || '';
const secret = env.KIMI_SECRET || '';
const stayQueued = env.KIMI_STAY_QUEUED?.toLowerCase() === 'true';

if (!username || !agentName || !secret) {
  console.error(
    'Missing Kimi agent configuration. Set KIMI_USERNAME, KIMI_AGENT, and KIMI_SECRET (or the BRIINE_* fallbacks).',
  );
  process.exit(1);
}

const agent = new KimiAgent(
  username,
  agentName,
  VERSION,
  secret,
  stayQueued,
);

if (host) {
  BriineAgent.register(agent, host);
} else {
  BriineAgent.register(agent);
}
