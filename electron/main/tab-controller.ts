import path from "path";

import { attachTabEventHandlers, type TabEntry as EventTabEntry } from "./tab-events";
import type {
  BrowserWindowLike as OAuthBrowserWindowLike,
  OAuthPopupEntry,
  RegisterAuthPopupOptions,
} from "./oauth";

export type DebugLog = (category: string, ...args: unknown[]) => boolean;
export type NavigationDecision = { kind: string; category?: string };
export type ClassifyNavigationRequest = (request: {
  url: string;
  openerUrl?: string;
  disposition?: string;
  frameName?: string;
}) => NavigationDecision;
export type WindowOpenPolicy = (request: {
  url: string;
  openerUrl?: string;
  disposition?: string;
  frameName?: string;
}) => NavigationDecision;
export type WebContentsViewLike = {
  webContents: Record<string, unknown> & {
    id: number;
    getURL: () => string;
    focus: () => void;
    executeJavaScript: (code: string) => Promise<unknown>;
    insertCSS: (css: string) => Promise<unknown>;
    setWindowOpenHandler: (
      handler: (details: {
        url: string;
        disposition?: string;
        frameName?: string;
      }) => {
        action: "allow" | "deny";
        overrideBrowserWindowOptions?: Record<string, unknown>;
      },
    ) => void;
    on: (event: string, listener: (...args: any[]) => void) => unknown;
    loadURL(url: string): Promise<void> | void;
  };
};
export type WebContentsViewConstructorLike = new (
  options: Record<string, unknown>,
) => WebContentsViewLike;
export type TabEntry = {
  id: number;
  view: WebContentsViewLike;
  createdAt: number;
  title: string;
  url: string;
  favicon: string | null;
  isHome: boolean;
};
export type TabState = { tabs: Map<number, TabEntry>; nextTabIdRef(): number };
export type TabHelpers = {
  ensureTopLevelView(view: WebContentsViewLike): void;
  setTabVisibility(tab: TabEntry, visible: boolean): void;
  layoutViews(): void;
  switchToTab(id: number): void;
  switchRelativeTab(step: number): void;
  closeTab(id: number): void;
  focusHomeTab(options: {
    resetToHome?: boolean;
    switchToTab: (id: number) => void;
  }): void;
};
export type OAuthHelpers = {
  popupWindowOptions?: (
    shellBackgroundColor: () => string,
  ) => Record<string, unknown>;
  registerAuthPopupWindow?: (
    window: OAuthBrowserWindowLike,
    startUrl: string,
    options: RegisterAuthPopupOptions,
  ) => OAuthPopupEntry;
  openAuthPopupForTab?: (
    url: string,
    openerUrl: string,
    shellBackgroundColor: () => string,
    sourceWebContentsId: number | null,
  ) => void;
};
export type AttachTabEventHandlersLike = (
  tab: TabEntry,
  helpers: Record<string, unknown>,
) => void;

type CreateTabControllerOptions = {
  appName: string;
  appUrl: string;
  broadcastTabsState: () => void;
  classifyNavigationRequest: ClassifyNavigationRequest;
  classifyWindowOpenRequest: WindowOpenPolicy;
  debugLog: DebugLog;
  getCanvaSession: () => unknown;
  homeUrl: string;
  isBlankPopupUrl: (url: string) => boolean;
  isCanvaAuthUrl: (url: string) => boolean;
  isCanvaUrl: (url: string) => boolean;
  isSafeExternalUrl: (url: string) => boolean;
  oauthHelpers: OAuthHelpers;
  shell: { openExternal?: (url: string) => unknown };
  shellBackgroundColor: () => string;
  state: TabState;
  tabHelpers: TabHelpers;
  WebContentsView: WebContentsViewConstructorLike;
  attachTabEventHandlersImpl?: AttachTabEventHandlersLike;
};

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
 * @typedef {{ popupWindowOptions?: (shellBackgroundColor: () => string) => Record<string, unknown>, registerAuthPopupWindow?: Function, openAuthPopupForTab?: Function }} OAuthHelpers
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
export function createTabController({
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
}: CreateTabControllerOptions) {
  const attachHandlers: AttachTabEventHandlersLike = attachTabEventHandlersImpl ||
    ((tab, helpers) => {
      attachTabEventHandlers(
        tab as EventTabEntry,
        helpers as Parameters<typeof attachTabEventHandlers>[1],
      );
    });

  /**
   * @param {string} [url]
   * @param {{ activate?: boolean, isHome?: boolean }} [options]
   * @returns {TabEntry}
   */
  function createTab(
    url = appUrl,
    {
      activate = true,
      isHome = false,
    }: { activate?: boolean; isHome?: boolean } = {},
  ): TabEntry {
    debugLog(
      "tabs:navigation",
      "create",
      url,
      `activate=${activate}`,
      `home=${isHome}`,
    );
    const id = state.nextTabIdRef();
    const preloadPath = path.resolve(
      __dirname,
      "..",
      "preload",
      "canva.bundle.js",
    );
    debugLog("tabs:navigation", "preload-path", preloadPath);

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
      createdAt: Date.now(),
      title: isHome ? "Home" : appName,
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
  function switchToTab(id: number): void {
    return tabHelpers.switchToTab(id);
  }

  /** @param {number} step */
  function switchRelativeTab(step: number): void {
    return tabHelpers.switchRelativeTab(step);
  }

  /** @param {number} id */
  function closeTab(id: number): void {
    return tabHelpers.closeTab(id);
  }

  /** @param {{ resetToHome?: boolean }} [options] */
  function focusHomeTab({
    resetToHome = true,
  }: { resetToHome?: boolean } = {}): void {
    return tabHelpers.focusHomeTab({ resetToHome, switchToTab });
  }

  /** @returns {TabEntry} */
  function createHomeTab(): TabEntry {
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
