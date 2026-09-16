import BriineAgent from '@briine/sdk';
import DeepSeekAgent from './agent.ts';

/**
 * Entry point for the DeepSeek bot.
 *
 * Configuration is read from the runtime environment so credentials stay out
 * of source control:
 *   DEEPSEEK_USERNAME   (or BRIINE_USERNAME)
 *   DEEPSEEK_HOST       (or BRIINE_HOST)
 *   DEEPSEEK_AGENT      agent/bot name
 *   DEEPSEEK_SECRET     agent secret
 *   DEEPSEEK_VERSION    agent version, e.g. "0.0.1"
 */

const env = process.env;

const VERSION = '0.0.2';

const username = env.BRIINE_USERNAME;
const host = env.BRIINE_HOST;
const agentName = env.DEEPSEEK_AGENT;
const secret = env.DEEPSEEK_SECRET;
const stayQueued = env.BRIINE_STAY_QUEUED === 'true';

if (!username || !agentName || !secret) {
  console.error(
    'Missing DeepSeek agent configuration. Set DEEPSEEK_USERNAME, DEEPSEEK_AGENT, and DEEPSEEK_SECRET (or the BRIINE_* fallbacks).',
  );
  process.exit(1);
}

const agent = new DeepSeekAgent(
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
