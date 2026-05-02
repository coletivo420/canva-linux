'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const {
  normalizeEyeDropperImplementation,
  resolveEyeDropperImplementation,
} = loadRuntimeModule('preload/eyedropper-implementation');

const {
  CLEyeDropper,
  installClEyeDropperScalingPatch,
  removeClEyeDropperUi,
} = loadRuntimeModule('preload/cl-eyedropper/index');

const {
  LTCodeEyeDropper,
  installLtcodeScalingPatch,
  removeLtcodeUi,
} = loadRuntimeModule('preload/ltcode-eyedropper');

/**
 * @param {string | undefined} value
 * @param {() => void} fn
 */
function withImplementationEnv(value, fn) {
  const previous = process.env.CANVA_EYEDROPPER_IMPL;
  if (value === undefined) {
    delete process.env.CANVA_EYEDROPPER_IMPL;
  } else {
    process.env.CANVA_EYEDROPPER_IMPL = value;
  }

  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.CANVA_EYEDROPPER_IMPL;
    } else {
      process.env.CANVA_EYEDROPPER_IMPL = previous;
    }
  }
}

test('normalizes EyeDropper implementation selection', () => {
  assert.equal(normalizeEyeDropperImplementation(undefined), 'cl');
  assert.equal(normalizeEyeDropperImplementation(''), 'cl');
  assert.equal(normalizeEyeDropperImplementation('cl'), 'cl');
  assert.equal(normalizeEyeDropperImplementation('legacy'), 'legacy');
  assert.equal(normalizeEyeDropperImplementation('ltcode'), 'legacy');
  assert.equal(normalizeEyeDropperImplementation('foo'), 'cl');
});

test('resolves CL as the default implementation', () => {
  const logs = [];
  withImplementationEnv(undefined, () => {
    const implementation = resolveEyeDropperImplementation({
      logEyeDropper(...args) {
        logs.push(args);
      },
    });

    assert.equal(implementation.name, 'cl');
    assert.equal(implementation.EyeDropperClass, CLEyeDropper);
    assert.equal(implementation.installScalingPatch, installClEyeDropperScalingPatch);
    assert.equal(implementation.removeUi, removeClEyeDropperUi);
  });

  assert.deepEqual(logs, [['eyedropper:flow', 'implementation-selected', 'cl']]);
});

test('resolves explicit CL implementation', () => {
  withImplementationEnv('cl', () => {
    const implementation = resolveEyeDropperImplementation({
      logEyeDropper() {},
    });

    assert.equal(implementation.name, 'cl');
    assert.equal(implementation.EyeDropperClass, CLEyeDropper);
  });
});

test('resolves legacy and ltcode aliases to LTCode implementation', () => {
  for (const value of ['legacy', 'ltcode']) {
    withImplementationEnv(value, () => {
      const implementation = resolveEyeDropperImplementation({
        logEyeDropper() {},
      });

      assert.equal(implementation.name, 'legacy');
      assert.equal(implementation.EyeDropperClass, LTCodeEyeDropper);
      assert.equal(implementation.installScalingPatch, installLtcodeScalingPatch);
      assert.equal(implementation.removeUi, removeLtcodeUi);
    });
  }
});

test('invalid implementation values fall back to CL and log the fallback', () => {
  const logs = [];
  withImplementationEnv('foo', () => {
    const implementation = resolveEyeDropperImplementation({
      logEyeDropper(...args) {
        logs.push(args);
      },
    });

    assert.equal(implementation.name, 'cl');
    assert.equal(implementation.EyeDropperClass, CLEyeDropper);
  });

  assert.deepEqual(logs, [
    ['eyedropper:flow', 'implementation-invalid', 'foo', 'fallback=cl'],
    ['eyedropper:flow', 'implementation-selected', 'cl'],
  ]);
});
