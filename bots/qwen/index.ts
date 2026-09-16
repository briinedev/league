import BriineAgent from '@briine/sdk';
import QwenAgent from './agent.ts';

/**
 * Entry point for the Qwen bot.
 *
 * Configuration is read from the environment (see .env.local for the expected
 * keys) so credentials stay out of source code:
 *   QWEN_USERNAME   (or BRIINE_USERNAME)
 *   QWEN_HOST       (or BRIINE_HOST)
 *   QWEN_AGENT      agent/bot name
 *   QWEN_SECRET     agent secret
 *   QWEN_VERSION    agent version, e.g. "0.0.1"
 *   QWEN_STAY_QUEUED  set "true" to auto-requeue after matches
 */

const username = process.env.QWEN_USERNAME || process.env.BRIINE_USERNAME || '';
const host = process.env.QWEN_HOST || process.env.BRIINE_HOST || '';
const agentName = process.env.QWEN_AGENT || '';
const secret = process.env.QWEN_SECRET || '';
const version = process.env.QWEN_VERSION || '0.0.1';
const stayQueued = (process.env.BRIINE_STAY_QUEUED || '').toLowerCase() === 'true';

if (!username || !agentName || !secret) {
  console.error(
    'Missing Qwen agent configuration. Set QWEN_USERNAME, QWEN_AGENT, and QWEN_SECRET (or the BRIINE_* fallbacks).',
  );
  process.exit(1);
}

const agent = new QwenAgent(
  username,
  agentName,
  version,
  secret,
  stayQueued,
);

if (host) {
  BriineAgent.register(agent, host);
} else {
  BriineAgent.register(agent);
}
