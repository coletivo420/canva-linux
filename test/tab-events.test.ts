// @ts-nocheck
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const { attachTabEventHandlers } = loadRuntimeModule('main/tab-events');

function createHarness(classifyWindowOpenRequest, { shell } = {}) {
  const listeners = new Map();
  const registeredPopups = [];
  const createdTabs = [];
  const externalUrls = [];
  const wc = {
    id: 42,
    getURL() {
      return 'https://www.canva.com/design';
    },
    focus() {},
    loadURL() {},
    executeJavaScript() {
      return Promise.resolve();
    },
    insertCSS() {
      return Promise.resolve();
    },
    setWindowOpenHandler(handler) {
      listeners.set('window-open-handler', handler);
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
  };

  attachTabEventHandlers(
    {
      id: 7,
      title: 'Design',
      url: 'https://www.canva.com/design',
      favicon: null,
      view: { webContents: wc },
    },
    {
      appName: 'Canva',
      appUrl: 'https://www.canva.com',
      broadcastTabsState() {},
      classifyNavigationRequest() {
        return { category: 'tabs', kind: 'external' };
      },
      classifyWindowOpenRequest,
      closeTab() {},
      createTab(url, options) {
        const tab = { url, options };
        createdTabs.push(tab);
        return tab;
      },
      debugLog() {
        return true;
      },
      isBlankPopupUrl(url) {
        return !url || url === 'about:blank' || url === 'about:srcdoc';
      },
      isCanvaAuthUrl() {
        return false;
      },
      isCanvaUrl(url) {
        return String(url).startsWith('https://www.canva.com/');
      },
      isSafeExternalUrl(url) {
        return String(url).startsWith('https://');
      },
      oauthHelpers: {
        popupWindowOptions() {
          return {};
        },
        registerAuthPopupWindow(window, url, options) {
          registeredPopups.push({ window, url, options });
        },
        openAuthPopupForTab() {},
      },
      shell: shell || {
        openExternal(url) {
          externalUrls.push(url);
        },
      },
      shellBackgroundColor() {
        return '#ffffff';
      },
      switchRelativeTab() {},
    }
  );

  return {
    createdTabs,
    externalUrls,
    listeners,
    registeredPopups,
  };
}

test('did-create-window registers only OAuth popups', () => {
  const { listeners, registeredPopups } = createHarness(() => ({ category: 'oauth', kind: 'oauth-popup' }));
  let closed = false;

  listeners.get('did-create-window')(
    {
      close() {
        closed = true;
      },
    },
    {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      frameName: 'google-auth',
      referrer: { url: 'https://www.canva.com/login' },
    }
  );

  assert.equal(closed, false);
  assert.equal(registeredPopups.length, 1);
  assert.equal(registeredPopups[0].url, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(registeredPopups[0].options.sourceWebContentsId, 42);
});

test('did-create-window closes and redirects internal tabs instead of registering OAuth popup', () => {
  const { createdTabs, listeners, registeredPopups } = createHarness(() => ({ category: 'tabs', kind: 'internal-tab' }));
  let closed = false;

  listeners.get('did-create-window')(
    {
      close() {
        closed = true;
      },
    },
    {
      url: 'https://www.canva.com/design/next',
      frameName: '',
      referrer: { url: 'https://www.canva.com/design' },
    }
  );

  assert.equal(closed, true);
  assert.equal(registeredPopups.length, 0);
  assert.deepEqual(createdTabs, [
    {
      url: 'https://www.canva.com/design/next',
      options: { activate: true },
    },
  ]);
});

test('did-create-window closes and opens external browser windows without OAuth registration', () => {
  const { externalUrls, listeners, registeredPopups } = createHarness(() => ({ category: 'tabs', kind: 'external-browser' }));
  let closed = false;

  listeners.get('did-create-window')(
    {
      close() {
        closed = true;
      },
    },
    {
      url: 'https://example.com/share',
      frameName: '',
      referrer: { url: 'https://www.canva.com/design' },
    }
  );

  assert.equal(closed, true);
  assert.equal(registeredPopups.length, 0);
  assert.deepEqual(externalUrls, ['https://example.com/share']);
});

test('window open external handling does not require injected shell.openExternal', () => {
  const { listeners, registeredPopups } = createHarness(() => ({ category: 'tabs', kind: 'external-browser' }), { shell: {} });

  assert.doesNotThrow(() => {
    const result = listeners.get('window-open-handler')({
      url: 'https://example.com/share',
      disposition: 'foreground-tab',
      frameName: '',
    });

    assert.deepEqual(result, { action: 'deny' });
  });
  assert.equal(registeredPopups.length, 0);
});

test('external navigation blocking does not require injected shell.openExternal', () => {
  const { listeners } = createHarness(() => ({ category: 'tabs', kind: 'external-browser' }), { shell: {} });
  let prevented = false;

  assert.doesNotThrow(() => {
    listeners.get('will-navigate')(
      {
        preventDefault() {
          prevented = true;
        },
      },
      'https://example.com/share'
    );
  });
  assert.equal(prevented, true);
});
