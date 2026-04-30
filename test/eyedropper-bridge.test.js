'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  resolveRequestingTab,
  validateSnapshotRequester,
} = require('../electron/main/eyedropper-bridge');

test('resolveRequestingTab scopes lookup to the requesting webContents', () => {
  const sender = { id: 22 };
  const expectedTab = /** @type {any} */ ({ id: 3, view: {} });

  assert.equal(
    resolveRequestingTab(sender, (webContents) => (webContents === sender ? expectedTab : null)),
    expectedTab
  );
  assert.equal(resolveRequestingTab({ id: 99 }, () => null), null);
});

test('validateSnapshotRequester requires a resolved tab with a view', () => {
  assert.equal(validateSnapshotRequester({ id: 1 }, /** @type {any} */ ({ id: 1, view: {} })), true);
  assert.equal(validateSnapshotRequester({ id: 1 }, null), false);
  assert.equal(validateSnapshotRequester({ id: 1 }, /** @type {any} */ ({ id: 1 })), false);
});
