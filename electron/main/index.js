// @ts-nocheck
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

const APP_VERSION = require('../../package.json').version;
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
const centralLogger = createCentralLogger({ app });
const { debugLevel, debugEnabled, debugLog } = createDebugTools({
  emit(category, args) {
    centralLogger.logDebug(category, args, { source: 'main' });
  },
});

let mainWindow = null;
let toolbarView = null;
let activeTabId = null;
let nextTabId = 1;
let nextPopupId = 1;
const tabs = new Map();
const authPopups = new Map();
let canvaSession = null;
let findTabByWebContents = () => null;
let createHomeTab = () => null;

configureLinuxRuntime({
  app,
  appId: APP_ID,
  path,
  wmClass: WM_CLASS,
});

function getCanvaSession() {
  if (!canvaSession) {
    canvaSession = session.fromPartition(PARTITION, { cache: true });
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
  BrowserWindow,
  debugLog,
  layoutViews() {
    return layoutViews();
  },
  nativeTheme,
  WebContentsView,
});
const { shellBackgroundColor } = shellHelpers;

const loggingHelpers = createLoggingHelpers({
  getMainWindow: () => mainWindow,
  getAuthPopups: () => authPopups,
  getFindTabByWebContents: () => findTabByWebContents,
});
const { summarizeOauthEntry, webContentsLabel, windowLabel } = loggingHelpers;

const { classifyWindowOpenRequest } = createWindowOpenPolicy({
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
});

function makeToolbarUrl() {
  return `file://${path.join(__dirname, '..', 'ui', 'toolbar.html')}`;
}

function currentTheme() {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function sharedWebPreferences(extra = {}) {
  return require('./runtime').sharedWebPreferences(getCanvaSession, extra);
}

const tabHelpers = createTabHelpers({
  appName: APP_NAME,
  broadcastTabsState,
  createHomeTab: () => createHomeTab(),
  debugLog,
  findTabByWebContentsRef(value) {
    findTabByWebContents = value;
  },
  getHomeUrl: () => HOME_URL,
  mainWindowRef: () => mainWindow,
  nativeTheme,
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
  BrowserWindow,
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
  debugLog,
  detectCanvaOAuthCallback,
  extractHostname,
  flushSession,
  getActiveTab: () => tabs.get(activeTabId),
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

function createShellWindow() {
  return shellHelpers.createShellWindow({
    setMainWindow(value) {
      mainWindow = value;
      if (!value) {
        toolbarView = null;
      }
    },
  });
}

function ensureTopLevelView(view) {
  if (!mainWindow || !view) return;
  mainWindow.contentView.addChildView(view);
}

function createToolbarView() {
  return shellHelpers.createToolbarView({
    broadcastTabsState,
    ensureTopLevelView,
    layoutViews,
    makeToolbarUrl,
    preloadPath: path.join(__dirname, '..', 'preload', 'toolbar.js'),
    setToolbarView(value) {
      toolbarView = value;
    },
  });
}

function layoutViews() {
  return tabHelpers.layoutViews();
}

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

function broadcastTabsState() {
  debugLog('tabs:state', 'state-broadcast', `active=${activeTabId}`, `count=${tabs.size}`);
  if (toolbarView && !toolbarView.webContents.isDestroyed()) {
    const state = tabHelpers.toolbarState();
    debugLog(
      'tabs:state',
      'state-broadcast-toolbar',
      `url=${toolbarView.webContents.getURL() || 'about:blank'}`,
      `theme=${state.theme}`,
      `titles=${state.tabs.map((tab) => `${tab.id}:${tab.title}`).join(' | ') || 'none'}`
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
  debugEnabled,
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
  tabHelpers,
  WebContentsView,
});
createHomeTab = tabController.createHomeTab;

registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents,
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
  configureSession,
  createShellWindow,
  createToolbarView,
  debugLog,
  debugLevel,
  flushSession,
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
      debugLog,
    });
  },
  shouldGrantRemotePermission,
  tabController,
});
