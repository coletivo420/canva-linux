'use strict';

function createTabHelpers({
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
}) {
  function getOrderedTabs() {
    return [...state.tabs.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  function getHomeTab() {
    return getOrderedTabs().find((tab) => tab.isHome) || null;
  }

  function updateWindowTitle() {
    const activeTab = state.tabs.get(state.activeTabId);
    const title = activeTab?.title || appName;
    mainWindowRef()?.setTitle(title ? `${title} - ${appName}` : appName);
  }

  function toolbarState() {
    return {
      activeTabId: state.activeTabId,
      tabs: getOrderedTabs().map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon,
        canClose: !tab.isHome,
      })),
      theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    };
  }

  function setTabVisibility(tab, visible) {
    if (!tab?.view) return;
    tab.view.setVisible(Boolean(visible));
  }

  function ensureTopLevelView(view) {
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

  function layoutViews() {
    debugLog('view', 'layout-views-start');
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
    debugLog('view', 'layout-views-done', `toolbar=${width}x${toolbarHeight}`, `tabs=${state.tabs.size}`);
  }

  function detachActiveContentView() {
    const activeTab = state.tabs.get(state.activeTabId);
    if (activeTab) {
      setTabVisibility(activeTab, false);
    }
  }

  function findTabByWebContents(webContents) {
    debugLog('view', 'find-tab-by-webcontents', webContents ? webContents.id : 'none');
    if (!webContents) return null;
    for (const tab of state.tabs.values()) {
      if (tab.view.webContents.id === webContents.id) {
        return tab;
      }
    }
    return null;
  }

  findTabByWebContentsRef(findTabByWebContents);

  function focusHomeTab({ resetToHome = true, switchToTab }) {
    debugLog('tabs:navigation', 'focus-home', `reset=${resetToHome}`);
    const homeTab = getHomeTab();
    if (!homeTab) return;
    if (resetToHome && homeTab.url !== getHomeUrl()) {
      homeTab.view.webContents.loadURL(getHomeUrl());
    }
    switchToTab(homeTab.id);
  }

  function switchToTab(id) {
    debugLog('tabs:navigation', 'switch-request', id);
    const mainWindow = mainWindowRef();
    if (!state.tabs.has(id) || !mainWindow) return;
    const tab = state.tabs.get(id);

    if (state.activeTabId === id) {
      tab.view.webContents.focus();
      debugLog('tabs:navigation', 'switch-active', id, tab.url);
      return;
    }

    detachActiveContentView();
    ensureTopLevelView(tab.view);
    setTabVisibility(tab, true);
    setActiveTabId(id);
    layoutViews();
    ensureTopLevelView(toolbarViewRef());
    tab.view.webContents.focus();
    debugLog('tabs:navigation', 'switch-active', id, tab.url);
    broadcastTabsState();
  }

  function switchRelativeTab(step) {
    const ordered = getOrderedTabs();
    if (ordered.length < 2) return;
    const currentIndex = ordered.findIndex((tab) => tab.id === state.activeTabId);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + step + ordered.length) % ordered.length;
    switchToTab(ordered[nextIndex].id);
  }

  function closeTab(id) {
    debugLog('tabs:navigation', 'close-request', id);
    const ordered = getOrderedTabs();
    const index = ordered.findIndex((tab) => tab.id === id);
    const tab = state.tabs.get(id);
    if (!tab || tab.isHome) return;

    if (state.activeTabId === id) {
      detachActiveContentView();
    }

    if (mainWindowRef()?.contentView?.children.includes(tab.view)) {
      mainWindowRef().contentView.removeChildView(tab.view);
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

module.exports = {
  createTabHelpers,
};
