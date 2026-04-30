'use strict';

// @ts-check

const assert = require('node:assert/strict');
const test = require('node:test');

const { createTabHelpers } = require('../electron/main/tabs');

/**
 * @param {number} id
 * @returns {any}
 */
function createView(id) {
  return {
    visible: false,
    bounds: null,
    webContents: {
      id,
      focused: false,
      destroyed: false,
      url: 'https://www.canva.com/',
      getURL() {
        return this.url;
      },
      /** @param {string} url */
      loadURL(url) {
        this.url = url;
      },
      focus() {
        this.focused = true;
      },
      isDestroyed() {
        return this.destroyed;
      },
      destroy() {
        this.destroyed = true;
      },
      send() {},
    },
    /** @param {boolean} visible */
    setVisible(visible) {
      this.visible = visible;
    },
    /** @param {unknown} bounds */
    setBounds(bounds) {
      this.bounds = bounds;
    },
  };
}

function createHelpers() {
  /** @type {{ tabs: Map<number, any>, activeTabId: number | null }} */
  const state = {
    tabs: new Map(),
    activeTabId: null,
  };
  const mainWindow = {
    title: '',
    contentView: {
      /** @type {unknown[]} */
      children: [],
      /** @param {unknown} view */
      addChildView(view) {
        this.children.push(view);
      },
      /** @param {unknown} view */
      removeChildView(view) {
        this.children = this.children.filter((child) => child !== view);
      },
    },
    /** @returns {[number, number]} */
    getContentSize() {
      return [1200, 800];
    },
    /** @param {string} title */
    setTitle(title) {
      this.title = title;
    },
  };
  const toolbarView = createView(100);
  const helpers = createTabHelpers({
    appName: 'Canva Linux',
    broadcastTabsState() {},
    createHomeTab() {},
    debugLog() {
      return true;
    },
    findTabByWebContentsRef(fn) {
      void fn;
    },
    getHomeUrl() {
      return 'https://www.canva.com/';
    },
    mainWindowRef() {
      return mainWindow;
    },
    nativeTheme: { shouldUseDarkColors: true },
    setActiveTabId(id) {
      state.activeTabId = id;
    },
    state,
    toolbarHeight: 44,
    toolbarViewRef() {
      return toolbarView;
    },
  });

  return { helpers, mainWindow, state, toolbarView };
}

test('toolbarState orders tabs and marks home tab as non-closable', () => {
  const { helpers, state } = createHelpers();
  state.activeTabId = 2;
  state.tabs.set(2, {
    id: 2,
    createdAt: 20,
    title: 'Design',
    url: 'https://www.canva.com/design',
    favicon: 'icon.png',
    isHome: false,
    view: createView(2),
  });
  state.tabs.set(1, {
    id: 1,
    createdAt: 10,
    title: 'Home',
    url: 'https://www.canva.com/',
    favicon: null,
    isHome: true,
    view: createView(1),
  });

  assert.deepEqual(helpers.toolbarState(), {
    activeTabId: 2,
    tabs: [
      { id: 1, title: 'Home', url: 'https://www.canva.com/', favicon: null, canClose: false },
      { id: 2, title: 'Design', url: 'https://www.canva.com/design', favicon: 'icon.png', canClose: true },
    ],
    theme: 'dark',
  });
});

test('updateWindowTitle reflects the active tab', () => {
  const { helpers, mainWindow, state } = createHelpers();
  state.activeTabId = 1;
  state.tabs.set(1, {
    id: 1,
    createdAt: 1,
    title: 'Design',
    url: 'https://www.canva.com/design',
    favicon: null,
    isHome: false,
    view: createView(1),
  });

  helpers.updateWindowTitle();
  assert.equal(mainWindow.title, 'Design - Canva Linux');
});

test('findTabByWebContents resolves by webContents id', () => {
  const { helpers, state } = createHelpers();
  state.tabs.set(1, {
    id: 1,
    createdAt: 1,
    title: 'Design',
    url: 'https://www.canva.com/design',
    favicon: null,
    isHome: false,
    view: createView(55),
  });

  assert.equal(helpers.findTabByWebContents({ id: 55 })?.id, 1);
  assert.equal(helpers.findTabByWebContents({ id: 99 }), null);
});
