// @ts-check
'use strict';

const path = require('path');

const {
  app,
  safeStorage,
  BrowserWindow,
  WebContentsView,
  shell,
  session,
  ipcMain,
  nativeTheme,
} = require('electron');

const { createDebugTools } = require('../shared/debug');
const {
  classifyWindowOpenRequest: sharedClassifyWindowOpenRequest,
  detectCanvaOAuthCallback,
  extractHostname,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isOAuthProviderUrl,
  isCanvaUrl,
  isSafeExternalUrl,
  shouldGrantRemotePermission,
} = require('../shared/navigation');

const { registerEyeDropperBridge } = require('./eyedropper-bridge');
const { registerGpuDiagnostics: registerGpuDiagnosticsModule } = require('./gpu-diagnostics');
const { registerMainIpcHandlers } = require('./ipc');
const { registerAppLifecycle } = require('./lifecycle');
const { createCentralLogger, createStatusLogger } = require('./logging');
const { createLoggingHelpers } = require('./logging-helpers');
const { createOAuthHelpers } = require('./oauth');
const { configureLinuxRuntime, configureSession, flushSession } = require('./runtime');
const { createShellHelpers } = require('./shell');
const { createTabController } = require('./tab-controller');
const { createTabHelpers } = require('./tabs');
const { createWindowOpenPolicy } = require('./window-open-policy');

const APP_ID = 'io.github.PirateMaryRead.canva-linux';
const APP_URL = 'https://www.canva.com';
const APP_NAME = 'Canva';
const PARTITION = 'persist:canva';
const HOME_URL = APP_URL;
const TOOLBAR_HEIGHT = 46;
const WM_CLASS = APP_ID;
const APP_ICON_PATH = path.join(__dirname, '..', 'assets', 'canva-icon.png');
const APP_VERSION = app.getVersion();
const centralLogger = createCentralLogger({ app });
const { debugLevel, debugEnabled, debugLog } = createDebugTools({
  emit(category, args) {
    centralLogger.logDebug(category, args, { source: 'main' });
  },
});

/**
 * @typedef {import('./shell').BrowserWindowLike & import('./oauth').BrowserWindowLike & import('./logging-helpers').BrowserWindowLike} BrowserWindowInstance
 * @typedef {import('./tabs').WebContentsViewLike & import('./shell').WebContentsViewLike} WebContentsViewInstance
 * @typedef {import('./runtime').SessionLike} ElectronSession
 * @typedef {import('electron').WebContents} ElectronWebContents
 */
/**
 * @typedef {import('./tabs').TabEntry} TabEntry
 */
/**
 * @typedef {import('./oauth').OAuthPopupEntry} AuthPopupEntry
 */
/**
 * @typedef {(webContents: { id?: number } | null | undefined) => TabEntry | null} FindTabByWebContents
 * @typedef {() => TabEntry | null} CreateHomeTab
 */

/** @type {BrowserWindowInstance | null} */
let mainWindow = null;
/** @type {WebContentsViewInstance | null} */
let toolbarView = null;
/** @type {number | null} */
let activeTabId = null;
/** @type {number} */
let nextTabId = 1;
/** @type {number} */
let nextPopupId = 1;
/** @type {Map<number, TabEntry>} */
const tabs = new Map();
/** @type {Map<number, AuthPopupEntry>} */
const authPopups = new Map();
/** @type {ElectronSession | null} */
let canvaSession = null;
/** @type {FindTabByWebContents} */
let findTabByWebContents = () => null;
/** @type {CreateHomeTab} */
let createHomeTab = () => null;

configureLinuxRuntime({
  app,
  appId: APP_ID,
  path,
  wmClass: WM_CLASS,
});

/**
 * @returns {ElectronSession}
 */
function getCanvaSession() {
  if (!canvaSession) {
    canvaSession = /** @type {ElectronSession} */ (/** @type {unknown} */ (session.fromPartition(PARTITION, { cache: true })));
  }
  return canvaSession;
}

const { logCredentialStorageBackend, logReleaseStatus } = createStatusLogger({
  app,
  appVersion: APP_VERSION,
  debugLog,
  logStatus: centralLogger.logStatus,
  safeStorage,
});

const shellHelpers = createShellHelpers({
  appIconPath: APP_ICON_PATH,
  appName: APP_NAME,
  BrowserWindow: /** @type {new (options: Record<string, unknown>) => import('./shell').BrowserWindowLike} */ (/** @type {unknown} */ (BrowserWindow)),
  debugLog,
  layoutViews() {
    return layoutViews();
  },
  nativeTheme,
  WebContentsView: /** @type {new (options: Record<string, unknown>) => import('./shell').WebContentsViewLike} */ (/** @type {unknown} */ (WebContentsView)),
});
const { shellBackgroundColor } = shellHelpers;

const loggingHelpers = createLoggingHelpers({
  getMainWindow: () => mainWindow,
  getAuthPopups: () => /** @type {Map<number, import('./logging-helpers').OAuthPopupEntry>} */ (/** @type {unknown} */ (authPopups)),
  getFindTabByWebContents: () => findTabByWebContents,
});
const { summarizeOauthEntry, webContentsLabel, windowLabel } = loggingHelpers;

const { classifyWindowOpenRequest } = createWindowOpenPolicy({
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
});

/**
 * @returns {string}
 */
function makeToolbarUrl() {
  return `file://${path.join(__dirname, '..', 'ui', 'toolbar.html')}`;
}

/**
 * @returns {'dark' | 'light'}
 */
function currentTheme() {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * @param {Record<string, unknown>} [extra]
 * @returns {Record<string, unknown>}
 */
function sharedWebPreferences(extra = {}) {
  return require('./runtime').sharedWebPreferences(getCanvaSession, extra);
}

const tabHelpers = createTabHelpers({
  appName: APP_NAME,
  broadcastTabsState,
  createHomeTab: () => createHomeTab(),
  debugLog,
  /**
   * @param {FindTabByWebContents} value
   */
  findTabByWebContentsRef(value) {
    findTabByWebContents = value;
  },
  getHomeUrl: () => HOME_URL,
  mainWindowRef: () => mainWindow,
  nativeTheme,
  /**
   * @param {number | null} value
   */
  setActiveTabId(value) {
    activeTabId = value;
  },
  state: {
    get activeTabId() {
      return activeTabId;
    },
    tabs,
  },
  toolbarHeight: TOOLBAR_HEIGHT,
  toolbarViewRef: () => toolbarView,
});

const oauthHelpers = createOAuthHelpers({
  appIconPath: APP_ICON_PATH,
  appName: APP_NAME,
  authPopups,
  BrowserWindow: /** @type {new (options: Record<string, unknown>) => import('./oauth').BrowserWindowLike} */ (/** @type {unknown} */ (BrowserWindow)),
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
  debugLog,
  detectCanvaOAuthCallback,
  extractHostname,
  flushSession: /** @type {(session: unknown) => Promise<void>} */ (/** @type {unknown} */ (flushSession)),
  getActiveTab: () => /** @type {import('./oauth').CanvaTabEntry | undefined} */ (/** @type {unknown} */ (activeTabId === null ? undefined : tabs.get(activeTabId))),
  getCanvaSession,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isCanvaUrl,
  isOAuthProviderUrl,
  isSafeExternalUrl,
  mainWindowRef: () => mainWindow,
  nextPopupIdRef() {
    return nextPopupId++;
  },
  shell,
  sharedWebPreferences,
  summarizeOauthEntry,
  windowLabel,
});

/**
 * @returns {BrowserWindowInstance}
 */
function createShellWindow() {
  return /** @type {BrowserWindowInstance} */ (/** @type {unknown} */ (shellHelpers.createShellWindow({
    /**
     * @param {import('./shell').BrowserWindowLike | null} value
     */
    setMainWindow(value) {
      mainWindow = /** @type {BrowserWindowInstance | null} */ (/** @type {unknown} */ (value));
      if (!value) {
        toolbarView = null;
      }
    },
  })));
}

/**
 * @param {WebContentsViewInstance | null | undefined} view
 * @returns {void}
 */
function ensureTopLevelView(view) {
  if (!mainWindow || !view) return;
  mainWindow.contentView.addChildView(view);
}

/**
 * @returns {WebContentsViewInstance}
 */
function createToolbarView() {
  return /** @type {WebContentsViewInstance} */ (/** @type {unknown} */ (shellHelpers.createToolbarView({
    broadcastTabsState,
    ensureTopLevelView: /** @type {(view: import('./shell').WebContentsViewLike) => void} */ (ensureTopLevelView),
    layoutViews,
    makeToolbarUrl,
    preloadPath: path.join(__dirname, '..', 'preload', 'toolbar.js'),
    /**
     * @param {import('./shell').WebContentsViewLike} value
     */
    setToolbarView(value) {
      toolbarView = /** @type {WebContentsViewInstance} */ (/** @type {unknown} */ (value));
    },
  })));
}

/**
 * @returns {void}
 */
function layoutViews() {
  return tabHelpers.layoutViews();
}

/**
 * @returns {void}
 */
function applyThemeToShell() {
  debugLog('app', 'theme-updated', currentTheme());
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(shellBackgroundColor());
  for (const entry of authPopups.values()) {
    if (!entry.window.isDestroyed()) {
      entry.window.setBackgroundColor(shellBackgroundColor());
    }
  }
}

/**
 * @returns {void}
 */
function broadcastTabsState() {
  debugLog('tabs:state', 'state-broadcast', `active=${activeTabId}`, `count=${tabs.size}`);
  if (toolbarView && !toolbarView.webContents.isDestroyed()) {
    const state = tabHelpers.toolbarState();
    debugLog(
      'tabs:state',
      'state-broadcast-toolbar',
      `url=${toolbarView.webContents.getURL() || 'about:blank'}`,
      `theme=${state.theme}`,
      `titles=${state.tabs.map((/** @type {{ id: number, title: string }} */ tab) => `${tab.id}:${tab.title}`).join(' | ') || 'none'}`
    );
    toolbarView.webContents.send('tabs-state', state);
  } else {
    debugLog(
      'tabs:state',
      'state-broadcast-skipped',
      `toolbarExists=${toolbarView ? 'true' : 'false'}`,
      `toolbarDestroyed=${toolbarView?.webContents?.isDestroyed?.() ? 'true' : 'false'}`
    );
  }
  tabHelpers.updateWindowTitle();
}

// The tab controller owns tab creation plus the wiring between tab-events.js
// and the lower-level state helpers in tabs.js.
const tabController = createTabController({
  appName: APP_NAME,
  appUrl: APP_URL,
  broadcastTabsState,
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
  classifyWindowOpenRequest,
  debugLog,
  getCanvaSession,
  homeUrl: HOME_URL,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isCanvaUrl,
  isSafeExternalUrl,
  oauthHelpers,
  shell,
  shellBackgroundColor,
  state: {
    nextTabIdRef() {
      return nextTabId++;
    },
    tabs,
  },
  tabHelpers: /** @type {import('./tab-controller').TabHelpers} */ (/** @type {unknown} */ (tabHelpers)),
  WebContentsView: /** @type {import('./tab-controller').WebContentsViewConstructorLike} */ (/** @type {unknown} */ (WebContentsView)),
});
createHomeTab = /** @type {CreateHomeTab} */ (/** @type {unknown} */ (tabController.createHomeTab));

registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents: /** @type {import('./eyedropper-bridge').FindTabByWebContentsFn} */ (/** @type {unknown} */ (findTabByWebContents)),
});

registerMainIpcHandlers({
  centralLogger,
  debugEnabled,
  debugLog,
  ipcMain,
  tabController,
});

registerAppLifecycle({
  app,
  BrowserWindow,
  canvaSessionRef: () => canvaSession,
  centralLogger,
  configureSession: /** @type {(options: Record<string, unknown>) => Promise<unknown>} */ (/** @type {unknown} */ (configureSession)),
  createShellWindow,
  createToolbarView,
  debugLog,
  debugLevel,
  flushSession: /** @type {(session: unknown) => Promise<void>} */ (/** @type {unknown} */ (flushSession)),
  getCanvaSession,
  logCredentialStorageBackend,
  logReleaseStatus,
  nativeTheme,
  onThemeUpdated() {
    applyThemeToShell();
    broadcastTabsState();
  },
  partition: PARTITION,
  path,
  registerGpuDiagnostics() {
    registerGpuDiagnosticsModule({
      app,
      centralLogger,
      debugLog: debugLog.bind(null, 'gpu'),
    });
  },
  shouldGrantRemotePermission,
  tabController,
});
