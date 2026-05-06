// @ts-nocheck
'use strict';

// @ts-check

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const {
  sharedWebPreferences,
  shouldEnableCaptureVerboseLogging,
} = loadRuntimeModule('main/runtime');

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, '..');

/**
 * @param {{ CANVA_DEBUG?: string, CANVA_DEBUG_LEVEL?: string }} env
 * @param {() => void} fn
 */
function withDebugEnv(env, fn) {
  const previousDebug = process.env.CANVA_DEBUG;
  const previousLevel = process.env.CANVA_DEBUG_LEVEL;
  try {
    if ('CANVA_DEBUG' in env) process.env.CANVA_DEBUG = env.CANVA_DEBUG;
    else delete process.env.CANVA_DEBUG;

    if ('CANVA_DEBUG_LEVEL' in env) process.env.CANVA_DEBUG_LEVEL = env.CANVA_DEBUG_LEVEL;
    else delete process.env.CANVA_DEBUG_LEVEL;

    fn();
  } finally {
    if (previousDebug === undefined) delete process.env.CANVA_DEBUG;
    else process.env.CANVA_DEBUG = previousDebug;

    if (previousLevel === undefined) delete process.env.CANVA_DEBUG_LEVEL;
    else process.env.CANVA_DEBUG_LEVEL = previousLevel;
  }
}

test('CANVA_DEBUG=1 does not enable Chromium capture verbose logging', () => {
  withDebugEnv({ CANVA_DEBUG: '1' }, () => {
    assert.equal(shouldEnableCaptureVerboseLogging(), false);
  });
});

test('CANVA_DEBUG=2 enables Chromium capture verbose logging', () => {
  withDebugEnv({ CANVA_DEBUG: '2' }, () => {
    assert.equal(shouldEnableCaptureVerboseLogging(), true);
  });
});

test('module-specific debug values do not enable verbose logging', () => {
  withDebugEnv({ CANVA_DEBUG: 'gpu' }, () => {
    assert.equal(shouldEnableCaptureVerboseLogging(), false);
  });
});

test('sharedWebPreferences keeps secure defaults', () => {
  const session = /** @type {any} */ ({
    partition: 'persist:canva',
  });
  const preferences = sharedWebPreferences(() => session);

  assert.equal(preferences.session, session);
  assert.equal(preferences.contextIsolation, true);
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.spellcheck, true);
});

test('main runtime opens Canva, not the project website, as the app home URL', () => {
  const mainSource = fs.readFileSync(path.join(repoRoot, 'electron/main/index.ts'), 'utf8');

  assert.match(mainSource, /const APP_URL = 'https:\/\/www\.canva\.com\/';/);
  assert.doesNotMatch(mainSource, /const APP_URL = 'https:\/\/coletivo420\.github\.io\/canva-linux\/';/);
});
