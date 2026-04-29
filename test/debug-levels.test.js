'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  getDebugLevel,
  isDebugEnabled,
  normalizeDebugCategory,
  createDebugTools,
} = require('../electron/shared/debug');

/**
 * @param {{ CANVA_DEBUG?: string; CANVA_DEBUG_LEVEL?: string }} env
 * @param {() => void} fn
 */
function withEnv(env, fn) {
  const previousDebug = process.env.CANVA_DEBUG;
  const previousLevel = process.env.CANVA_DEBUG_LEVEL;

  if ('CANVA_DEBUG' in env) {
    process.env.CANVA_DEBUG = env.CANVA_DEBUG;
  } else {
    delete process.env.CANVA_DEBUG;
  }

  if ('CANVA_DEBUG_LEVEL' in env) {
    process.env.CANVA_DEBUG_LEVEL = env.CANVA_DEBUG_LEVEL;
  } else {
    delete process.env.CANVA_DEBUG_LEVEL;
  }

  try {
    fn();
  } finally {
    if (previousDebug === undefined) delete process.env.CANVA_DEBUG;
    else process.env.CANVA_DEBUG = previousDebug;

    if (previousLevel === undefined) delete process.env.CANVA_DEBUG_LEVEL;
    else process.env.CANVA_DEBUG_LEVEL = previousLevel;
  }
}

test('debug level is disabled by default', () => {
  withEnv({}, () => {
    assert.equal(getDebugLevel(), 0);
    assert.equal(isDebugEnabled(), false);
  });
});

test('CANVA_DEBUG=1 enables internal logs', () => {
  withEnv({ CANVA_DEBUG: '1' }, () => {
    assert.equal(getDebugLevel(), 1);
    assert.equal(isDebugEnabled(), true);
  });
});

test('CANVA_DEBUG=2 enables verbose debug level', () => {
  withEnv({ CANVA_DEBUG: '2' }, () => {
    assert.equal(getDebugLevel(), 2);
    assert.equal(isDebugEnabled(), true);
  });
});

test('module-specific CANVA_DEBUG values are unsupported', () => {
  withEnv({ CANVA_DEBUG: 'gpu' }, () => {
    assert.equal(getDebugLevel(), 0);
    assert.equal(isDebugEnabled(), false);
  });
});

test('CANVA_DEBUG_LEVEL overrides CANVA_DEBUG', () => {
  withEnv({ CANVA_DEBUG: '0', CANVA_DEBUG_LEVEL: '2' }, () => {
    assert.equal(getDebugLevel(), 2);
  });
});

test('normalizes category labels without enabling module filters', () => {
  assert.equal(normalizeDebugCategory('GPU.Features'), 'gpu:features');
  assert.equal(normalizeDebugCategory(' tabs state '), 'tabsstate');
});

test('debug tools emit all categories when debug is enabled', () => {
  withEnv({ CANVA_DEBUG: '1' }, () => {
    /** @type {Array<{ category: string; args: unknown[] }>} */
    const seen = [];

    const tools = createDebugTools({
      emit(category, args) {
        seen.push({ category, args });
      },
    });

    assert.equal(tools.debugLog('gpu:features', 'ok'), true);
    assert.deepEqual(seen, [{ category: 'gpu:features', args: ['ok'] }]);
  });
});
