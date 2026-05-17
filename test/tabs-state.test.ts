// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { createTabHelpers } = loadRuntimeModule("main/tabs");

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
      url: "https://www.canva.com/",
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
    title: "",
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
    appName: "Canva Linux",
    broadcastTabsState() {},
    createHomeTab() {},
    debugLog() {
      return true;
    },
    findTabByWebContentsRef(/** @type {Function} */ fn) {
      void fn;
    },
    getHomeUrl() {
      return "https://www.canva.com/";
    },
    mainWindowRef() {
      return mainWindow;
    },
    nativeTheme: { shouldUseDarkColors: true },
    setActiveTabId(/** @type {number | null} */ id) {
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

test("toolbarState separates pinned home from regular tabs", () => {
  const { helpers, state } = createHelpers();
  state.activeTabId = 2;
  state.tabs.set(2, {
    id: 2,
    createdAt: 20,
    title: "Design",
    url: "https://www.canva.com/design",
    favicon: "./icon.png",
    isHome: false,
    view: createView(2),
  });
  state.tabs.set(1, {
    id: 1,
    createdAt: 10,
    title: "Home",
    url: "https://www.canva.com/",
    favicon: null,
    isHome: true,
    view: createView(1),
  });

  assert.deepEqual(helpers.toolbarState(), {
    activeTabId: 2,
    pinnedHomeTab: {
      id: 1,
      title: "Home",
      url: "https://www.canva.com/",
      favicon: null,
      canClose: false,
      isHome: true,
    },
    tabs: [
      {
        id: 2,
        title: "Design",
        url: "https://www.canva.com/design",
        favicon: "./icon.png",
        canClose: true,
        isHome: false,
      },
    ],
    theme: "dark",
  });
  assert.equal(helpers.toolbarState().tabs.some((tab) => tab.isHome), false);
});

test("toolbarState uses tab id as secondary ordering tiebreaker", () => {
  const { helpers, state } = createHelpers();
  state.tabs.set(2, {
    id: 2,
    createdAt: 10,
    title: "Second",
    url: "https://www.canva.com/design/second",
    favicon: null,
    isHome: false,
    view: createView(2),
  });
  state.tabs.set(1, {
    id: 1,
    createdAt: 10,
    title: "First",
    url: "https://www.canva.com/design/first",
    favicon: null,
    isHome: false,
    view: createView(1),
  });

  assert.deepEqual(
    helpers.toolbarState().tabs.map((tab) => tab.id),
    [1, 2],
  );
});

test("updateWindowTitle reflects the active tab", () => {
  const { helpers, mainWindow, state } = createHelpers();
  state.activeTabId = 1;
  state.tabs.set(1, {
    id: 1,
    createdAt: 1,
    title: "Design",
    url: "https://www.canva.com/design",
    favicon: null,
    isHome: false,
    view: createView(1),
  });

  helpers.updateWindowTitle();
  assert.equal(mainWindow.title, "Design - Canva Linux");
});

test("findTabByWebContents resolves by webContents id", () => {
  const { helpers, state } = createHelpers();
  state.tabs.set(1, {
    id: 1,
    createdAt: 1,
    title: "Design",
    url: "https://www.canva.com/design",
    favicon: null,
    isHome: false,
    view: createView(55),
  });

  assert.equal(helpers.findTabByWebContents({ id: 55 })?.id, 1);
  assert.equal(helpers.findTabByWebContents({ id: 99 }), null);
});


test("toolbarState blocks remote favicon URLs from the toolbar state", () => {
  const { helpers, state } = createHelpers();
  state.tabs.set(1, {
    id: 1,
    createdAt: 1,
    title: "Home",
    url: "https://www.canva.com/",
    favicon: "https://www.canva.com/favicon.ico",
    isHome: true,
    view: createView(1),
  });
  state.tabs.set(2, {
    id: 2,
    createdAt: 2,
    title: "Design",
    url: "https://www.canva.com/design",
    favicon: "data:image/png;base64,abc",
    isHome: false,
    view: createView(2),
  });

  const toolbarState = helpers.toolbarState();
  assert.equal(toolbarState.pinnedHomeTab?.favicon, null);
  assert.equal(toolbarState.tabs[0]?.favicon, "data:image/png;base64,abc");
});
