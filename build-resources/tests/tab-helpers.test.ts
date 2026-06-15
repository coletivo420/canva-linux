import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const { createTabHelpers } = await loadRuntimeModule("main/tabs") as {
  createTabHelpers: typeof import("../electron/main/tabs.js").createTabHelpers;
};

const repoRoot = process.env.CANVA_TEST_REPO_ROOT || process.cwd();

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
  visibilityWrites: boolean[];
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
    visibilityWrites: [],
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
      this.visibilityWrites.push(visible);
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
    tabs: new Map<number, FakeTab>(),
    activeTabId: null as number | null,
  };
  const attachedViews = new Set<FakeView>();
  const mainWindow = {
    title: "",
    contentView: {
      addChildView(view: FakeView) {
        operations.push(["add", view]);
        attachedViews.add(view);
      },
      removeChildView(view: FakeView) {
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
    findTabByWebContentsRef(_fn: (webContents: { id?: number } | null | undefined) => TabEntry | null) {},
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

test("switchToTab hides previous active tab and shows requested tab", () => {
  const { broadcasts, helpers, state } = createHelpers();
  const homeView = createView(1);
  const secondView = createView(2);
  const thirdView = createView(3);
  state.activeTabId = 1;
  state.tabs.set(1, createTab(1, homeView, true));
  state.tabs.set(2, createTab(2, secondView));
  state.tabs.set(3, createTab(3, thirdView));

  // Manually show home and third tab to see if switchToTab touches them
  homeView.setVisible(true);
  thirdView.setVisible(true);

  helpers.switchToTab(2);

  assert.equal(homeView.visible, false, "home tab (previous active) must be hidden");
  assert.equal(secondView.visible, true, "second tab (new active) must be shown");
  assert.equal(thirdView.visible, true, "third tab (not involved) should not be touched");
  assert.equal(state.activeTabId, 2);
  assert.equal(broadcasts.length, 1);

  helpers.switchToTab(3);

  assert.equal(secondView.visible, false, "second tab (previous active) must be hidden");
  assert.equal(thirdView.visible, true, "third tab (new active) must be shown");
  assert.equal(homeView.visible, false, "home tab (hidden before) should not be touched");
  assert.equal(state.activeTabId, 3);
  assert.equal(broadcasts.length, 2);
});

test("switchToTab does not sweep every tab in state.tabs", () => {
  const { helpers, state } = createHelpers();
  const homeView = createView(1);
  const secondView = createView(2);
  const thirdView = createView(3);
  state.activeTabId = 1;
  state.tabs.set(1, createTab(1, homeView, true));
  state.tabs.set(2, createTab(2, secondView));
  state.tabs.set(3, createTab(3, thirdView));

  helpers.switchToTab(2);

  assert.deepEqual(homeView.visibilityWrites, [false]);
  assert.deepEqual(secondView.visibilityWrites, [true]);
  assert.deepEqual(thirdView.visibilityWrites, []);
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

  // Pre-set visibility to ensure they aren't touched
  homeView.setVisible(false);
  secondView.setVisible(true);

  helpers.switchToTab(2);

  assert.equal(state.activeTabId, 2);
  assert.equal(secondView.webContents.focused, true);
  assert.deepEqual(operations, []);
  assert.deepEqual(broadcasts, []);
  assert.equal(homeView.visible, false);
  assert.equal(secondView.visible, true, "already active tab visibility should not be touched");
});

test("toolbarState separates pinnedHomeTab from regular tabs", () => {
  const { helpers, state } = createHelpers();
  const home = createTab(1, createView(1), true);
  const regular = createTab(2, createView(2));
  state.activeTabId = 1;
  state.tabs.set(1, home);
  state.tabs.set(2, regular);

  const toolbarState = helpers.toolbarState();

  assert.equal(toolbarState.pinnedHomeTab?.id, 1);
  assert.deepEqual(toolbarState.tabs.map((tab) => tab.id), [2]);
});

test("home tab is never included in regular tabs", () => {
  const { helpers, state } = createHelpers();
  state.tabs.set(1, createTab(1, createView(1), true));
  state.tabs.set(2, createTab(2, createView(2)));
  state.tabs.set(3, createTab(3, createView(3)));

  assert.equal(helpers.toolbarState().tabs.some((tab) => tab.isHome), false);
});

test("switchToTab keeps early return for already active tab", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources/electron/main/tabs.ts"),
    "utf8",
  );

  assert.match(source, /if\s*\(\s*state\.activeTabId\s*===\s*id\s*\)\s*{[\s\S]*?return;/);
});

test("switchToTab does not sweep all tabs", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources/electron/main/tabs.ts"),
    "utf8",
  );

  assert.doesNotMatch(source, /setTabVisibility\(\s*entry\s*,\s*entry\.id\s*===\s*id\s*\)/);
});

test("switchToTab re-adds toolbar above active content", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources/electron/main/tabs.ts"),
    "utf8",
  );
  const switchStart = source.indexOf("function switchToTab");
  const switchEnd = source.indexOf("function switchRelativeTab");
  const switchSource = source.slice(switchStart, switchEnd);

  assert.ok(switchStart >= 0 && switchEnd > switchStart);
  assert.match(switchSource, /ensureTopLevelView\(tab\.view\);[\s\S]*ensureTopLevelView\(toolbarViewRef\(\)\);/);
});

test("closeTab never closes home tab", () => {
  const { helpers, state } = createHelpers();
  const home = createTab(1, createView(1), true);
  state.activeTabId = 1;
  state.tabs.set(1, home);

  helpers.closeTab(1);

  assert.equal(state.tabs.has(1), true);
  assert.equal(home.view.webContents.isDestroyed(), false);
});

test("closeTab focuses fallback tab after closing active regular tab", () => {
  const { helpers, state } = createHelpers();
  const homeView = createView(1);
  const activeView = createView(2);
  const fallbackView = createView(3);
  state.activeTabId = 2;
  state.tabs.set(1, createTab(1, homeView, true));
  state.tabs.set(2, createTab(2, activeView));
  state.tabs.set(3, createTab(3, fallbackView));

  helpers.closeTab(2);

  assert.equal(state.tabs.has(2), false);
  assert.equal(state.activeTabId, 3);
  assert.equal(fallbackView.webContents.focused, true);
});
