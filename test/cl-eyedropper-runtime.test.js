'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const repoRoot = path.resolve(__dirname, '..');

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

test('CL-EyeDropper runtime exports the only picker surface', () => {
  const cl = loadRuntimeModule('preload/cl-eyedropper/index');

  assert.equal(typeof cl.CLEyeDropper, 'function');
  assert.equal(typeof cl.installClEyeDropperScalingPatch, 'function');
  assert.equal(typeof cl.removeClEyeDropperUi, 'function');
});

test('custom EyeDropper flow loads without the removed selector module', () => {
  const selectorModule = ['eye', 'dropper-implementation'].join('');
  const source = fs.readFileSync(path.join(repoRoot, 'electron/preload/custom-eyedropper-flow.ts'), 'utf8');

  assert.equal(source.includes(selectorModule), false);
  assert.equal(typeof withElectronMock(() => loadRuntimeModule('preload/custom-eyedropper-flow')).createCustomEyeDropperFlow, 'function');
});

test('source preload modules do not reference removed picker tokens', () => {
  const sourceFiles = [
    'electron/preload/custom-eyedropper-flow.ts',
    'electron/preload/native-eyedropper-wrapper.ts',
    'electron/preload/canva.ts',
  ];

  const removedTokens = [
    ['ltcode', 'eyedropper'].join('-'),
    ['LTCode', 'EyeDropper'].join(''),
    ['install', 'Ltcode', 'ScalingPatch'].join(''),
    ['remove', 'Ltcode', 'Ui'].join(''),
    ['CANVA', 'EYEDROPPER', 'IMPL'].join('_'),
    ['--canva', 'eyedropper', 'impl'].join('-'),
  ];

  for (const file of sourceFiles) {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    for (const token of removedTokens) {
      assert.equal(source.includes(token), false, `${token} should not appear in ${file}`);
    }
  }
});
