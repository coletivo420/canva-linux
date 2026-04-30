'use strict';

// @ts-check

const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const {
  describeTarget,
  normalizeHex: normalizeRoutingHex,
  serializeValue,
  summarizeStream,
} = require('../electron/preload/eyedropper-routing-diagnostics');

const {
  installNativeEyeDropperWrapper,
  isWrappedEyeDropperInstalledInScope,
} = require('../electron/preload/native-eyedropper-wrapper');

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function withElectronMock(fn) {
  const moduleLoader = /** @type {typeof Module & { _load: (request: string, parent: unknown, isMain: boolean) => unknown }} */ (Module);
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function mockElectron(request, parent, isMain) {
    if (request === 'electron') {
      return {
        ipcRenderer: {
          invoke() {
            return Promise.resolve(null);
          },
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return fn();
  } finally {
    moduleLoader._load = originalLoad;
  }
}

const {
  createAbortError,
  createOperationError,
  normalizeHex: normalizeCustomHex,
} = withElectronMock(() => require('../electron/preload/custom-eyedropper-flow'));

test('normalizes EyeDropper hex values', () => {
  assert.equal(normalizeRoutingHex('#AABBCC'), '#aabbcc');
  assert.equal(normalizeRoutingHex('aabbcc'), '#aabbcc');
  assert.equal(normalizeRoutingHex('bad'), null);
  assert.equal(normalizeCustomHex('#AABBCC'), '#aabbcc');
  assert.equal(normalizeCustomHex('aabbcc'), '#aabbcc');
  assert.equal(normalizeCustomHex('bad'), null);
});

test('serializes values safely', () => {
  assert.equal(serializeValue(undefined), 'undefined');
  assert.equal(serializeValue(null), 'null');
  assert.equal(serializeValue({ video: true }), '{"video":true}');

  /** @type {{ self?: unknown }} */
  const circular = {};
  circular.self = circular;
  assert.equal(serializeValue(circular), '[unserializable]');
});

test('describes targets', () => {
  assert.equal(
    describeTarget({ tagName: 'BUTTON', id: 'pick', className: 'primary active extra ignored' }),
    'button#pick.primary.active.extra'
  );
  assert.equal(describeTarget(null), 'unknown');
});

test('summarizes media streams', () => {
  assert.equal(summarizeStream(null), 'no-tracks');
  assert.equal(summarizeStream({ getTracks: () => [] }), 'no-tracks');
  assert.equal(
    summarizeStream({
      getTracks: () => [
        { kind: 'video', readyState: 'live', label: 'screen' },
        { kind: 'audio', readyState: 'ended' },
      ],
    }),
    'video:live:screen,audio:ended'
  );
});

test('creates DOMException-compatible EyeDropper errors', () => {
  assert.equal(createAbortError().name, 'AbortError');
  assert.equal(createOperationError().name, 'OperationError');
});

test('detects wrapped EyeDropper installation in a scope', () => {
  function WrappedEyeDropper() {}

  assert.equal(isWrappedEyeDropperInstalledInScope({ __canvaWrappedEyeDropperInstalled: true }), true);
  assert.equal(
    isWrappedEyeDropperInstalledInScope({
      __canvaWrappedEyeDropper: WrappedEyeDropper,
      EyeDropper: WrappedEyeDropper,
    }),
    true
  );
  assert.equal(isWrappedEyeDropperInstalledInScope({ EyeDropper: WrappedEyeDropper }), true);
  assert.equal(isWrappedEyeDropperInstalledInScope({}), false);
});

test('native wrapper exports installer shape', () => {
  const wrapper = installNativeEyeDropperWrapper({
    logEyeDropper() {},
    wrapOpenCall() {
      return Promise.resolve({ sRGBHex: '#000000' });
    },
  });
  assert.equal(typeof wrapper.ensureWrappedEyeDropperInstalled, 'function');
});
