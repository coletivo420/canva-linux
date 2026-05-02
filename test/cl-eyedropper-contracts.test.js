'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

test('CL-EyeDropper contracts module loads without runtime side effects', () => {
  const before = Object.keys(globalThis);
  const contracts = loadRuntimeModule('preload/cl-eyedropper/index');
  const after = Object.keys(globalThis);

  assert.deepEqual(Object.keys(contracts), []);
  assert.deepEqual(after, before);
});
