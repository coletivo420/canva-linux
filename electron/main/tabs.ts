import type { DebugLog, TabEntry, WebContentsViewLike } from "../shared/types";

export type { TabEntry, WebContentsViewLike } from "../shared/types";
export type TabStateLike = {
  tabs: Map<number, TabEntry>;
  activeTabId: number | null;
};
export type NativeThemeLike = { shouldUseDarkColors: boolean };
export type BrowserWindowLike = {
  setTitle(title: string): void;
  getContentSize(): [number, number];
  contentView: {
    children?: unknown[];
    addChildView(view: unknown): void;
    removeChildView(view: unknown): void;
  };
};

type CreateTabHelpersOptions = {
  appName: string;
  broadcastTabsState: () => void;
  createHomeTab: () => void;
  debugLog: DebugLog;
  findTabByWebContentsRef: (
    fn: (webContents: { id?: number } | null | undefined) => TabEntry | null,
  ) => void;
  getHomeUrl: () => string;
  mainWindowRef: () => BrowserWindowLike | null | undefined;
  nativeTheme: NativeThemeLike;
  setActiveTabId: (id: number | null) => void;
  state: TabStateLike;
  toolbarHeight: number;
  toolbarViewRef: () => WebContentsViewLike | null | undefined;
};

export type ToolbarTabItem = {
  id: number;
  title: string;
  url: string;
  favicon?: string | null;
  canClose: boolean;
  isHome: boolean;
};

export type ToolbarState = {
  activeTabId: number | null;
  pinnedHomeTab: ToolbarTabItem | null;
  tabs: ToolbarTabItem[];
  theme: string;
};

/**
 * @param {{
 *   appName: string;
 *   broadcastTabsState: () => void;
 *   createHomeTab: () => void;
 *   debugLog: DebugLog;
 *   findTabByWebContentsRef: (fn: (webContents: { id?: number } | null | undefined) => TabEntry | null) => void;
 *   getHomeUrl: () => string;
 *   mainWindowRef: () => BrowserWindowLike | null | undefined;
 *   nativeTheme: NativeThemeLike;
 *   setActiveTabId: (id: number | null) => void;
 *   state: TabStateLike;
 *   toolbarHeight: number;
 *   toolbarViewRef: () => WebContentsViewLike | null | undefined;
 * }} options
 */
export function createTabHelpers({
  appName,
  broadcastTabsState,
  createHomeTab,
  debugLog,
  findTabByWebContentsRef,
  getHomeUrl,
  mainWindowRef,
  nativeTheme,
  setActiveTabId,
  state,
  toolbarHeight,
  toolbarViewRef,
}: CreateTabHelpersOptions) {
  /** @returns {TabEntry[]} */
  function getOrderedTabs(): TabEntry[] {
    return [...state.tabs.values()].sort(
      (a, b) => a.createdAt - b.createdAt || a.id - b.id,
    );
  }

  /** @returns {TabEntry | null} */
  function getHomeTab(): TabEntry | null {
    return getOrderedTabs().find((tab) => tab.isHome) || null;
  }

  /** @returns {void} */
  function updateWindowTitle(): void {
    const activeTab =
      state.activeTabId === null ? null : state.tabs.get(state.activeTabId);
    const title = activeTab?.title;
    mainWindowRef()?.setTitle(
      title && title !== appName ? `${title} - ${appName}` : appName,
    );
  }

  /**
   * @param {string | null | undefined} favicon
   * @returns {string | null}
   */
  function safeToolbarFaviconUrl(favicon: string | null | undefined): string | null {
    if (!favicon) return null;
    if (/^(?:data:|file:)/i.test(favicon)) return favicon;
    if (/^[./]/.test(favicon)) return favicon;
    return null;
  }

  /**
   * @param {TabEntry} tab
   * @returns {ToolbarTabItem}
   */
  function toToolbarTabItem(tab: TabEntry): ToolbarTabItem {
    return {
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favicon: safeToolbarFaviconUrl(tab.favicon),
      canClose: !tab.isHome,
      isHome: Boolean(tab.isHome),
    };
  }

  /** @returns {{ activeTabId: number | null, pinnedHomeTab: ToolbarTabItem | null, tabs: ToolbarTabItem[], theme: string }} */
  function toolbarState(): ToolbarState {
    const orderedTabs = getOrderedTabs();
    const homeTab = orderedTabs.find((tab) => tab.isHome) ?? null;

    return {
      activeTabId: state.activeTabId,
      pinnedHomeTab: homeTab ? toToolbarTabItem(homeTab) : null,
      tabs: orderedTabs.filter((tab) => !tab.isHome).map(toToolbarTabItem),
      theme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
    };
  }

  /**
   * @param {TabEntry | null | undefined} tab
   * @param {boolean} visible
   * @returns {void}
   */
  function setTabVisibility(
    tab: TabEntry | null | undefined,
    visible: boolean,
  ): void {
    if (!tab?.view) return;
    tab.view.setVisible(Boolean(visible));
  }

  /**
   * @param {unknown} view
   * @returns {void}
   */
  function ensureTopLevelView(view: unknown): void {
    const mainWindow = mainWindowRef();
    if (!mainWindow || !view) return;
    const contentView = mainWindow.contentView;
    const children = contentView?.children || [];
    // Electron uses child order as z-order. To keep the toolbar visible and the
    // active tab directly beneath it, re-adding an existing child must first
    // remove the old attachment instead of silently no-oping.
    if (children.includes(view)) {
      contentView.removeChildView(view);
    }
    mainWindow.contentView.addChildView(view);
  }

  /** @returns {void} */
  function layoutViews(): void {
    debugLog("view", "layout-views-start");
    const mainWindow = mainWindowRef();
    const toolbarView = toolbarViewRef();
    if (!mainWindow || !toolbarView) return;
    const [width, height] = mainWindow.getContentSize();
    toolbarView.setBounds({ x: 0, y: 0, width, height: toolbarHeight });

    for (const tab of state.tabs.values()) {
      tab.view.setBounds({
        x: 0,
        y: toolbarHeight,
        width,
        height: Math.max(0, height - toolbarHeight),
      });
    }

    ensureTopLevelView(toolbarView);
    debugLog(
      "view",
      "layout-views-done",
      `toolbar=${width}x${toolbarHeight}`,
      `tabs=${state.tabs.size}`,
    );
  }

  /** @returns {void} */
  function detachActiveContentView(): void {
    const activeTab =
      state.activeTabId === null ? null : state.tabs.get(state.activeTabId);
    if (activeTab) {
      setTabVisibility(activeTab, false);
    }
  }

  /**
   * @param {{ id?: number } | null | undefined} webContents
   * @returns {TabEntry | null}
   */
  function findTabByWebContents(
    webContents: { id?: number } | null | undefined,
  ): TabEntry | null {
    debugLog(
      "view",
      "find-tab-by-webcontents",
      webContents ? webContents.id : "none",
    );
    if (!webContents) return null;
    for (const tab of state.tabs.values()) {
      if (tab.view.webContents.id === webContents.id) {
        return tab;
      }
    }
    return null;
  }

  findTabByWebContentsRef(findTabByWebContents);

  /**
   * @param {{ resetToHome?: boolean, switchToTab: (id: number) => void }} options
   * @returns {void}
   */
  function focusHomeTab({
    resetToHome = true,
    switchToTab,
  }: {
    resetToHome?: boolean;
    switchToTab: (id: number) => void;
  }): void {
    debugLog("tabs:navigation", "focus-home", `reset=${resetToHome}`);
    const homeTab = getHomeTab();
    if (!homeTab) return;
    if (resetToHome && homeTab.url !== getHomeUrl()) {
      homeTab.view.webContents.loadURL(getHomeUrl());
    }
    switchToTab(homeTab.id);
  }

  /**
   * @param {number} id
   * @returns {void}
   */
  function switchToTab(id: number): void {
    debugLog("tabs:navigation", "switch-request", id);
    const mainWindow = mainWindowRef();
    if (!state.tabs.has(id) || !mainWindow) return;
    const tab = state.tabs.get(id);
    if (!tab) return;

    if (state.activeTabId === id) {
      tab.view.webContents.focus();
      debugLog("tabs:navigation", "switch-active", id, tab.url);
      return;
    }

    detachActiveContentView();
    ensureTopLevelView(tab.view);
    setTabVisibility(tab, true);
    setActiveTabId(id);
    layoutViews();
    ensureTopLevelView(toolbarViewRef());
    tab.view.webContents.focus();
    debugLog("tabs:navigation", "switch-active", id, tab.url);
    broadcastTabsState();
  }

  /**
   * @param {number} step
   * @returns {void}
   */
  function switchRelativeTab(step: number): void {
    const ordered = getOrderedTabs();
    if (ordered.length < 2) return;
    const currentIndex = ordered.findIndex(
      (tab) => tab.id === state.activeTabId,
    );
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + step + ordered.length) % ordered.length;
    const nextTab = ordered[nextIndex];
    if (nextTab) switchToTab(nextTab.id);
  }

  /**
   * @param {number} id
   * @returns {void}
   */
  function closeTab(id: number): void {
    debugLog("tabs:navigation", "close-request", id);
    const ordered = getOrderedTabs();
    const index = ordered.findIndex((tab) => tab.id === id);
    const tab = state.tabs.get(id);
    if (!tab || tab.isHome) return;

    if (state.activeTabId === id) {
      detachActiveContentView();
    }

    const mainWindow = mainWindowRef();
    if (mainWindow?.contentView?.children?.includes(tab.view)) {
      mainWindow.contentView.removeChildView(tab.view);
    }
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.destroy();
    }
    state.tabs.delete(id);

    if (state.tabs.size === 0) {
      setActiveTabId(null);
      createHomeTab();
      return;
    }

    const fallback = ordered[index + 1] || ordered[index - 1] || getHomeTab();
    if (fallback) {
      switchToTab(fallback.id);
    } else {
      broadcastTabsState();
    }
  }

  return {
    closeTab,
    detachActiveContentView,
    ensureTopLevelView,
    findTabByWebContents,
    focusHomeTab,
    getHomeTab,
    getOrderedTabs,
    layoutViews,
    setTabVisibility,
    switchRelativeTab,
    switchToTab,
    toolbarState,
    updateWindowTitle,
  };
}
