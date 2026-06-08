import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const { createTabHelpers } = await loadRuntimeModule("main/tabs") as {
  createTabHelpers: typeof import("../electron/main/tabs.js").createTabHelpers;
};

type FakeBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FakeWebContents = {
  id: number;
  focused: boolean;
  focus(): void;
  getURL(): string;
  loadURL(url: string): void;
  isDestroyed(): boolean;
  destroy(): void;
  send(channel: string, payload?: unknown): void;
};

type FakeView = {
  visible: boolean;
  bounds: FakeBounds | null;
  webContents: FakeWebContents;
  setVisible(visible: boolean): void;
  setBounds(bounds: FakeBounds): void;
};

type FakeTab = {
  id: number;
  createdAt: number;
  title: string;
  url: string;
  favicon: string | null;
  isHome: boolean;
  view: FakeView;
};

function createView(id: number): FakeView {
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
      loadURL(_url: string) {},
      isDestroyed() {
        return false;
      },
      destroy() {},
      send(_channel: string, _payload?: unknown) {},
    },
    setVisible(visible: boolean) {
      this.visible = visible;
    },
    setBounds(bounds: FakeBounds) {
      this.bounds = bounds;
    },
  };
}

function createTab(id: number, view: FakeView, isHome: boolean = false): FakeTab {
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

function createHelpers(options: { throwOnMissingRemove?: boolean } = {}) {
  const operations: [string, FakeView][] = [];
  const broadcasts: unknown[] = [];
  const state = {
    tabs: new Map<number, any>(),
    activeTabId: null as number | null,
  };
  const attachedViews = new Set<FakeView>();
  const mainWindow = {
    title: "",
    contentView: {
      addChildView(view: any) {
        operations.push(["add", view]);
        attachedViews.add(view);
      },
      removeChildView(view: any) {
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
    setTitle(title: string) {
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
    findTabByWebContentsRef(_fn: any) {},
    getHomeUrl() {
      return "https://www.canva.com/";
    },
    mainWindowRef() {
      return mainWindow as any;
    },
    nativeTheme: { shouldUseDarkColors: false },
    setActiveTabId(id: number | null) {
      state.activeTabId = id;
    },
    state: state as any,
    toolbarHeight: 46,
    toolbarViewRef() {
      return toolbarView as any;
    },
  });

  return { broadcasts, helpers, mainWindow, operations, state, toolbarView };
}

test("ensureTopLevelView removes before re-adding without children tracking", () => {
  const { helpers, operations } = createHelpers();
  const view = createView(1);

  helpers.ensureTopLevelView(view as any);

  assert.deepEqual(operations, [
    ["remove", view],
    ["add", view],
  ]);
});

test("ensureTopLevelView still adds views when remove rejects missing attachments", () => {
  const { helpers, operations } = createHelpers({ throwOnMissingRemove: true });
  const view = createView(1);

  assert.doesNotThrow(() => helpers.ensureTopLevelView(view as any));
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

  let tabViewAddIndex = -1;
  let lastToolbarAddIndex = -1;
  for (let i = 0; i < operations.length; i++) {
    const [op, view] = operations[i];
    if (op === "add" && view === tabView) {
      tabViewAddIndex = i;
    }
    if (op === "add" && view === toolbarView) {
      lastToolbarAddIndex = i;
    }
  }
  assert.ok(tabViewAddIndex !== -1, "tabView should be added");
  assert.ok(lastToolbarAddIndex !== -1, "toolbarView should be added");
  assert.ok(tabViewAddIndex < lastToolbarAddIndex, "tabView must be added before the final toolbarView addition");
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

test("switchToTab focuses and returns when requested tab is already active", () => {
  const { helpers, state, operations, broadcasts } = createHelpers();
  const homeView = createView(1);
  const secondView = createView(2);

  state.activeTabId = 2;
  state.tabs.set(1, createTab(1, homeView, true));
  state.tabs.set(2, createTab(2, secondView));

  helpers.switchToTab(2);

  assert.equal(state.activeTabId, 2);
  assert.equal(secondView.webContents.focused, true);
  assert.deepEqual(operations, []);
  assert.deepEqual(broadcasts, []);
  assert.equal(homeView.visible, false);
  assert.equal(secondView.visible, false);
});
