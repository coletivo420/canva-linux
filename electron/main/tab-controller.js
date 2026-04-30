'use strict';

// @ts-check

const path = require('path');

const { attachTabEventHandlers } = require('./tab-events');

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 * @typedef {{ kind: string, category?: string }} NavigationDecision
 * @typedef {(request: { url: string, openerUrl?: string, disposition?: string, frameName?: string }) => NavigationDecision} ClassifyNavigationRequest
 * @typedef {(request: { url: string, openerUrl?: string, disposition?: string, frameName?: string }) => NavigationDecision} WindowOpenPolicy
 * @typedef {{
 *   webContents: Record<string, unknown> & { loadURL(url: string): Promise<void> | void };
 * }} WebContentsViewLike
 * @typedef {new (options: Record<string, unknown>) => WebContentsViewLike} WebContentsViewConstructorLike
 * @typedef {{ id: number, view: WebContentsViewLike, createdAt: number, title: string, url: string, favicon: string | null, isHome: boolean }} TabEntry
 * @typedef {{ tabs: Map<number, TabEntry>, nextTabIdRef(): number }} TabState
 * @typedef {{
 *   ensureTopLevelView(view: WebContentsViewLike): void;
 *   setTabVisibility(tab: TabEntry, visible: boolean): void;
 *   layoutViews(): void;
 *   switchToTab(id: number): void;
 *   switchRelativeTab(step: number): void;
 *   closeTab(id: number): void;
 *   focusHomeTab(options: { resetToHome?: boolean, switchToTab: (id: number) => void }): void;
 * }} TabHelpers
 * @typedef {{ popupWindowOptions?: (backgroundColor: string) => Record<string, unknown>, registerAuthPopupWindow?: Function, openAuthPopupForTab?: Function }} OAuthHelpers
 * @typedef {(tab: TabEntry, helpers: Record<string, unknown>) => void} AttachTabEventHandlersLike
 */

// Coordinate tab creation with the lower-level tab-state helpers.
// This preserves the current runtime wiring while letting index.js stay focused
// on bootstrap and process-wide composition.
/**
 * @param {{
 *   appName: string;
 *   appUrl: string;
 *   broadcastTabsState: () => void;
 *   classifyNavigationRequest: ClassifyNavigationRequest;
 *   classifyWindowOpenRequest: WindowOpenPolicy;
 *   debugLog: DebugLog;
 *   getCanvaSession: () => unknown;
 *   homeUrl: string;
 *   isBlankPopupUrl: (url: string) => boolean;
 *   isCanvaAuthUrl: (url: string) => boolean;
 *   isCanvaUrl: (url: string) => boolean;
 *   isSafeExternalUrl: (url: string) => boolean;
 *   oauthHelpers: OAuthHelpers;
 *   shell: { openExternal?: (url: string) => unknown };
 *   shellBackgroundColor: () => string;
 *   state: TabState;
 *   tabHelpers: TabHelpers;
 *   WebContentsView: WebContentsViewConstructorLike;
 *   attachTabEventHandlersImpl?: AttachTabEventHandlersLike;
 * }} options
 */
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
  attachTabEventHandlersImpl,
}) {
  const attachHandlers = attachTabEventHandlersImpl || /** @type {AttachTabEventHandlersLike} */ (/** @type {unknown} */ (attachTabEventHandlers));

  /**
   * @param {string} [url]
   * @param {{ activate?: boolean, isHome?: boolean }} [options]
   * @returns {TabEntry}
   */
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
    attachHandlers(tab, {
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

  /** @param {number} id */
  function switchToTab(id) {
    return tabHelpers.switchToTab(id);
  }

  /** @param {number} step */
  function switchRelativeTab(step) {
    return tabHelpers.switchRelativeTab(step);
  }

  /** @param {number} id */
  function closeTab(id) {
    return tabHelpers.closeTab(id);
  }

  /** @param {{ resetToHome?: boolean }} [options] */
  function focusHomeTab({ resetToHome = true } = {}) {
    return tabHelpers.focusHomeTab({ resetToHome, switchToTab });
  }

  /** @returns {TabEntry} */
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
