// @ts-nocheck
'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const {
  createOAuthHelpers,
  createOAuthPopupInitialState,
} = loadRuntimeModule('main/oauth');

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
    isCanvaAuthUrl: (/** @type {string} */ url) => url.includes('/login'),
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
    isCanvaAuthUrl: (/** @type {string} */ url) => url.includes('canva.com/login'),
    isOAuthProviderUrl: (/** @type {string} */ url) => url.includes('accounts.google.com'),
  });

  assert.equal(entry.startedOnCanvaAuth, true);
  assert.equal(entry.sawExternalProvider, true);
  assert.equal(entry.sourceWebContentsId, null);
});

test('OAuth popup close handler prevents premature window close before callback', () => {
  const authPopups = new Map();
  const windowListeners = new Map();
  const webContentsListeners = new Map();
  const window = {
    webContents: {
      session: { partition: 'persist:canva' },
      getURL: () => 'https://accounts.google.com/o/oauth2/v2/auth',
      getLastWebPreferences: () => ({ contextIsolation: true, nodeIntegration: false, sandbox: true }),
      on(event, listener) {
        webContentsListeners.set(event, listener);
      },
      once(event, listener) {
        webContentsListeners.set(`once:${event}`, listener);
      },
      setWindowOpenHandler(listener) {
        webContentsListeners.set('window-open-handler', listener);
      },
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
    once(event, listener) {
      windowListeners.set(`once:${event}`, listener);
    },
    on(event, listener) {
      windowListeners.set(event, listener);
    },
  };
  const helpers = createOAuthHelpers({
    appIconPath: '/tmp/icon.png',
    appName: 'Canva Linux',
    authPopups,
    BrowserWindow: function FakeBrowserWindow() {
      return window;
    },
    classifyNavigationRequest() {
      return { kind: 'blocked-external' };
    },
    debugLog() {
      return true;
    },
    detectCanvaOAuthCallback() {
      return null;
    },
    extractHostname() {
      return '';
    },
    flushSession: async () => {},
    getActiveTab() {
      return undefined;
    },
    getCanvaSession() {
      return window.webContents.session;
    },
    isBlankPopupUrl(url) {
      return !url || url === 'about:blank' || url === 'about:srcdoc';
    },
    isCanvaAuthUrl(url) {
      return String(url).includes('canva.com/login');
    },
    isCanvaUrl(url) {
      return String(url).includes('canva.com');
    },
    isOAuthProviderUrl(url) {
      return String(url).includes('accounts.google.com');
    },
    isSafeExternalUrl(url) {
      return String(url).startsWith('https://');
    },
    mainWindowRef() {
      return null;
    },
    nextPopupIdRef() {
      return 9;
    },
    shell: { openExternal() {} },
    sharedWebPreferences() {
      return {};
    },
    summarizeOauthEntry(entry) {
      return entry ? `popup=${entry.id}` : 'none';
    },
    windowLabel() {
      return 'oauth-popup';
    },
  });

  const entry = helpers.registerAuthPopupWindow(window, 'https://accounts.google.com/o/oauth2/v2/auth', {
    openerUrl: 'https://www.canva.com/login',
    sourceWebContentsId: 1,
  });
  let prevented = false;

  windowListeners.get('close')({
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(entry.closeReason, 'closed-before-callback');
  assert.equal(authPopups.has(9), true);
});
