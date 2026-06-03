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
      focus() {
        this.focused = true;
      },
      getURL() {
        return "https://www.canva.com/";
      },
      loadURL() {},
      isDestroyed() {
        return false;
      },
      destroy() {},
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

/**
 * @param {number} id
 * @param {ReturnType<typeof createView>} view
 * @param {boolean} [isHome]
 * @returns {any}
 */
function createTab(id, view, isHome = false) {
  return {
    id,
    createdAt: id,
    title: isHome ? "Home" : `Design ${id}`,
    url: isHome ? "https://www.canva.com/" : `https://www.canva.com/design/${id}`,
    favicon: null,
    isHome,
    view,
  };
}

/**
 * @param {{ throwOnMissingRemove?: boolean }} [options]
 * @returns {any}
 */
function createHelpers(options = {}) {
  const operations = [];
  const broadcasts = [];
  const state = {
    tabs: new Map(),
    activeTabId: null,
  };
  const attachedViews = new Set();
  const mainWindow = {
    title: "",
    contentView: {
      addChildView(view) {
        operations.push(["add", view]);
        attachedViews.add(view);
      },
      removeChildView(view) {
        operations.push(["remove", view]);
        if (options.throwOnMissingRemove && !attachedViews.has(view)) {
          throw new Error("view is not attached");
        }
        attachedViews.delete(view);
      },
    },
    getContentSize() {
      return [1200, 800];
    },
    setTitle(title) {
      this.title = title;
    },
  };
  const toolbarView = createView(100);
  const helpers = createTabHelpers({
    appName: "Canva Linux",
    broadcastTabsState() {
      broadcasts.push(helpers.toolbarState());
    },
    createHomeTab() {},
    debugLog() {},
    findTabByWebContentsRef(fn) {
      void fn;
    },
    getHomeUrl() {
      return "https://www.canva.com/";
    },
    mainWindowRef() {
      return mainWindow;
    },
    nativeTheme: { shouldUseDarkColors: false },
    setActiveTabId(id) {
      state.activeTabId = id;
    },
    state,
    toolbarHeight: 46,
    toolbarViewRef() {
      return toolbarView;
    },
  });

  return { broadcasts, helpers, mainWindow, operations, state, toolbarView };
}

test("ensureTopLevelView removes before re-adding without children tracking", () => {
  const { helpers, operations } = createHelpers();
  const view = createView(1);

  helpers.ensureTopLevelView(view);

  assert.deepEqual(operations, [
    ["remove", view],
    ["add", view],
  ]);
});

test("ensureTopLevelView still adds views when remove rejects missing attachments", () => {
  const { helpers, operations } = createHelpers({ throwOnMissingRemove: true });
  const view = createView(1);

  assert.doesNotThrow(() => helpers.ensureTopLevelView(view));
  assert.deepEqual(operations, [
    ["remove", view],
    ["add", view],
  ]);
});

test("switchToTab hides inactive tabs and shows requested tab", () => {
  const { broadcasts, helpers, state } = createHelpers();
  const homeView = createView(1);
  const secondView = createView(2);
  const thirdView = createView(3);
  state.activeTabId = 1;
  state.tabs.set(1, createTab(1, homeView, true));
  state.tabs.set(2, createTab(2, secondView));
  state.tabs.set(3, createTab(3, thirdView));

  helpers.switchToTab(2);
  assert.equal(homeView.visible, false);
  assert.equal(secondView.visible, true);
  assert.equal(thirdView.visible, false);
  assert.equal(state.activeTabId, 2);
  assert.equal(broadcasts.length, 1);

  helpers.switchToTab(3);
  assert.equal(homeView.visible, false);
  assert.equal(secondView.visible, false);
  assert.equal(thirdView.visible, true);
  assert.equal(state.activeTabId, 3);
  assert.equal(broadcasts.length, 2);
});

test("switchToTab re-adds active content view before toolbar", () => {
  const { helpers, operations, state, toolbarView } = createHelpers();
  const tabView = createView(2);
  state.tabs.set(1, createTab(1, createView(1), true));
  state.tabs.set(2, createTab(2, tabView));

  helpers.switchToTab(2);

  assert.deepEqual(operations.slice(-4), [
    ["remove", toolbarView],
    ["add", toolbarView],
    ["remove", toolbarView],
    ["add", toolbarView],
  ]);
  assert.deepEqual(operations.slice(0, 2), [
    ["remove", tabView],
    ["add", tabView],
  ]);
});

test("switchToTab ignores unknown tab ids", () => {
  const { broadcasts, helpers, operations, state } = createHelpers();
  state.activeTabId = 1;
  state.tabs.set(1, createTab(1, createView(1), true));

  helpers.switchToTab(999);

  assert.equal(state.activeTabId, 1);
  assert.deepEqual(operations, []);
  assert.deepEqual(broadcasts, []);
});

test("switchToTab focuses selected webContents", () => {
  const { helpers, state } = createHelpers();
  const tabView = createView(2);
  state.tabs.set(1, createTab(1, createView(1), true));
  state.tabs.set(2, createTab(2, tabView));

  helpers.switchToTab(2);

  assert.equal(tabView.webContents.focused, true);
});
