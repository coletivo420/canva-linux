'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createOAuthPopupInitialState,
} = require('../electron/main/oauth');

function fakeWindow() {
  return {
    webContents: {
      getURL: () => 'about:blank',
      getLastWebPreferences: () => ({ contextIsolation: true, nodeIntegration: false, sandbox: true }),
      on() {},
      once() {},
      setWindowOpenHandler() {},
      loadURL() {},
    },
    isDestroyed: () => false,
    destroy() {},
    focus() {},
    show() {},
    loadURL() {},
    setTitle() {},
    setMenuBarVisibility() {},
    setBackgroundColor() {},
    getBounds: () => ({ x: 0, y: 0, width: 520, height: 760 }),
    once() {},
    on() {},
  };
}

test('creates OAuth popup initial state for Canva auth opener', () => {
  const entry = createOAuthPopupInitialState({
    popupId: 1,
    window: fakeWindow(),
    startUrl: 'about:blank',
    openerUrl: 'https://www.canva.com/login',
    sourceWebContentsId: 10,
    isCanvaAuthUrl: (url) => url.includes('/login'),
    isOAuthProviderUrl: () => false,
  });

  assert.equal(entry.id, 1);
  assert.equal(entry.startedOnCanvaAuth, true);
  assert.equal(entry.sawExternalProvider, false);
  assert.equal(entry.sawAuthorizedCallback, false);
  assert.equal(entry.completionHandled, false);
  assert.equal(entry.pendingCallbackUrl, '');
  assert.equal(entry.closeReason, 'unknown');
  assert.equal(entry.sourceWebContentsId, 10);
});

test('creates OAuth popup initial state for external provider', () => {
  const entry = createOAuthPopupInitialState({
    popupId: 2,
    window: fakeWindow(),
    startUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    openerUrl: 'https://www.canva.com/login',
    sourceWebContentsId: null,
    isCanvaAuthUrl: (url) => url.includes('canva.com/login'),
    isOAuthProviderUrl: (url) => url.includes('accounts.google.com'),
  });

  assert.equal(entry.startedOnCanvaAuth, true);
  assert.equal(entry.sawExternalProvider, true);
  assert.equal(entry.sourceWebContentsId, null);
});
