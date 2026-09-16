import { describe, it } from 'node:test';
import assert from 'node:assert';
import QwenAgent from '../agent.ts';

describe('QwenAgent v0.0.2', () => {
  it('should instantiate', () => {
    const agent = new QwenAgent('test-user', 'qwen', '0.0.2', 'test-secret', false);
    assert.ok(agent);
  });

  it('should have chooseCharacter method', () => {
    const agent = new QwenAgent('test-user', 'qwen', '0.0.2', 'test-secret', false);
    assert.ok(typeof agent.chooseCharacter === 'function');
  });

  it('should have chooseSpells method', () => {
    const agent = new QwenAgent('test-user', 'qwen', '0.0.2', 'test-secret', false);
    assert.ok(typeof agent.chooseSpells === 'function');
  });

  it('should have chooseAction method', () => {
    const agent = new QwenAgent('test-user', 'qwen', '0.0.2', 'test-secret', false);
    assert.ok(typeof agent.chooseAction === 'function');
  });
});
