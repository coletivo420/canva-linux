'use strict';

// @ts-check

const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

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
          send() {},
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

const { normalizeEyeDropperCategoryHint } = withElectronMock(() => loadRuntimeModule('preload/debug'));

test('normalizes EyeDropper category hints', () => {
  assert.equal(normalizeEyeDropperCategoryHint('bridge'), 'eyedropper:bridge');
  assert.equal(normalizeEyeDropperCategoryHint('flow'), 'eyedropper:flow');
  assert.equal(normalizeEyeDropperCategoryHint('wrapper'), 'eyedropper:wrapper');
  assert.equal(normalizeEyeDropperCategoryHint('routing'), 'eyedropper:routing');
  assert.equal(normalizeEyeDropperCategoryHint('capture'), 'eyedropper:routing');
  assert.equal(normalizeEyeDropperCategoryHint('library'), 'eyedropper:library');
  assert.equal(normalizeEyeDropperCategoryHint('lib'), 'eyedropper:library');
  assert.equal(normalizeEyeDropperCategoryHint('invalid'), null);
});
