'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const {
  EYE_DROPPER_IMPLEMENTATION_ARGUMENT,
  normalizeEyeDropperImplementation,
  readEyeDropperImplementationArgument,
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
function withImplementationArgument(value, fn) {
  const previous = process.argv.slice();
  process.argv = previous.filter((arg) => !arg.startsWith(EYE_DROPPER_IMPLEMENTATION_ARGUMENT));

  if (value === undefined) {
    process.argv.push(`${EYE_DROPPER_IMPLEMENTATION_ARGUMENT}cl`);
  } else {
    process.argv.push(`${EYE_DROPPER_IMPLEMENTATION_ARGUMENT}${value}`);
  }

  try {
    fn();
  } finally {
    process.argv = previous;
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

test('reads EyeDropper implementation selection from renderer arguments', () => {
  assert.equal(readEyeDropperImplementationArgument(['app', '--canva-eyedropper-impl=legacy']), 'legacy');
  assert.equal(readEyeDropperImplementationArgument(['app', '--other=value']), undefined);
  assert.equal(readEyeDropperImplementationArgument(undefined), undefined);
});

test('resolves CL as the default implementation', () => {
  const logs = [];
  withImplementationArgument(undefined, () => {
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
  withImplementationArgument('cl', () => {
    const implementation = resolveEyeDropperImplementation({
      logEyeDropper() {},
    });

    assert.equal(implementation.name, 'cl');
    assert.equal(implementation.EyeDropperClass, CLEyeDropper);
  });
});

test('resolves legacy and ltcode aliases to LTCode implementation', () => {
  for (const value of ['legacy', 'ltcode']) {
    withImplementationArgument(value, () => {
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
  withImplementationArgument('foo', () => {
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
