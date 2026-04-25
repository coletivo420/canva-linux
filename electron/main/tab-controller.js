'use strict';

const path = require('path');

const { attachTabEventHandlers } = require('./tab-events');

// Coordinate tab creation with the lower-level tab-state helpers.
// This preserves the current runtime wiring while letting index.js stay focused
// on bootstrap and process-wide composition.
function createTabController({
  appName,
  appUrl,
  broadcastTabsState,
  classifyNavigationRequest,
  classifyWindowOpenRequest,
  debugLog,
  getCanvaSession,
  homeUrl,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isCanvaUrl,
  isSafeExternalUrl,
  oauthHelpers,
  shell,
  shellBackgroundColor,
  state,
  tabHelpers,
  WebContentsView,
}) {
  function createTab(url = appUrl, { activate = true, isHome = false } = {}) {
    debugLog('tabs:navigation', 'create', url, `activate=${activate}`, `home=${isHome}`);
    const id = state.nextTabIdRef();
    const preloadPath = path.resolve(__dirname, '..', 'preload', 'canva.bundle.js');
    debugLog('tabs:navigation', 'preload-path', preloadPath);

    // Each tab stays as its own WebContentsView so the shell can switch
    // visibility and bounds without changing how the shared session behaves.
    const view = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: false,
        sandbox: false,
        nodeIntegration: false,
        nodeIntegrationInSubFrames: true,
        session: getCanvaSession(),
        spellcheck: true,
      },
    });

    const tab = {
      id,
      view,
      createdAt: Date.now() + id,
      title: isHome ? 'Home' : appName,
      url,
      favicon: null,
      isHome,
    };

    // The per-tab event policy lives in tab-events.js; the controller injects
    // callbacks here so refactors do not duplicate navigation behavior.
    attachTabEventHandlers(tab, {
      appName,
      appUrl,
      broadcastTabsState,
      classifyNavigationRequest,
      classifyWindowOpenRequest,
      closeTab,
      createTab,
      debugLog,
      isBlankPopupUrl,
      isCanvaAuthUrl,
      isCanvaUrl,
      isSafeExternalUrl,
      oauthHelpers,
      shell,
      shellBackgroundColor,
      switchRelativeTab,
    });

    tabHelpers.ensureTopLevelView(view);
    tabHelpers.setTabVisibility(tab, false);
    view.webContents.loadURL(url);

    state.tabs.set(id, tab);
    tabHelpers.layoutViews();

    if (activate) {
      switchToTab(id);
    } else {
      broadcastTabsState();
    }

    return tab;
  }

  function switchToTab(id) {
    return tabHelpers.switchToTab(id);
  }

  function switchRelativeTab(step) {
    return tabHelpers.switchRelativeTab(step);
  }

  function closeTab(id) {
    return tabHelpers.closeTab(id);
  }

  function focusHomeTab({ resetToHome = true } = {}) {
    return tabHelpers.focusHomeTab({ resetToHome, switchToTab });
  }

  function createHomeTab() {
    return createTab(homeUrl, { activate: true, isHome: true });
  }

  return {
    closeTab,
    createHomeTab,
    createTab,
    focusHomeTab,
    switchRelativeTab,
    switchToTab,
  };
}

module.exports = {
  createTabController,
};
