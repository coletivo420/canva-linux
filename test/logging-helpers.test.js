'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const { createLoggingHelpers } = loadRuntimeModule('main/logging-helpers');

test('labels main window, OAuth popup window and generic windows', () => {
  const mainWindow = { id: 1 };
  const popupWindow = { id: 2 };
  const helpers = createLoggingHelpers({
    getMainWindow: () => mainWindow,
    getAuthPopups: () => new Map([[7, { id: 7, window: popupWindow }]]),
    getFindTabByWebContents: () => null,
  });

  assert.equal(helpers.windowLabel(mainWindow), 'main-window');
  assert.equal(helpers.windowLabel(popupWindow), 'oauth-popup-7');
  assert.equal(helpers.windowLabel({ id: 3 }), 'window');
  assert.equal(helpers.windowLabel(null), 'unknown-window');
});

test('labels tab, OAuth popup and generic webContents', () => {
  const tabWebContents = { id: 11 };
  const popupWebContents = { id: 12 };
  const helpers = createLoggingHelpers({
    getMainWindow: () => null,
    getAuthPopups: () => new Map([[8, { id: 8, window: { webContents: popupWebContents } }]]),
    getFindTabByWebContents: () => (/** @type {{ id?: number }} */ webContents) => (
      webContents === tabWebContents ? { id: 4 } : null
    ),
  });

  assert.equal(helpers.webContentsLabel(tabWebContents), 'tab-4');
  assert.equal(helpers.webContentsLabel(popupWebContents), 'oauth-popup-8');
  assert.equal(helpers.webContentsLabel({ id: 99 }), 'wc-99');
  assert.equal(helpers.webContentsLabel(null), 'unknown-webcontents');
});

test('summarizes OAuth popup entries', () => {
  const helpers = createLoggingHelpers({
    getMainWindow: () => null,
    getAuthPopups: () => new Map(),
    getFindTabByWebContents: () => null,
  });

  assert.equal(helpers.summarizeOauthEntry(null), 'popup=unknown');
  assert.equal(
    helpers.summarizeOauthEntry({
      id: 3,
      startedOnCanvaAuth: true,
      sawExternalProvider: false,
      sourceWebContentsId: 44,
    }),
    'popup=3 startedOnCanvaAuth=true sawExternalProvider=false source=44'
  );
});
