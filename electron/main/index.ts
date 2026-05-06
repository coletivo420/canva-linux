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
const {
  configureLinuxRuntime,
  configureSession,
  flushSession,
  sharedWebPreferences: createSharedWebPreferences,
} = require('./runtime');
const { createShellHelpers } = require('./shell');
const { createTabController } = require('./tab-controller');
const { createTabHelpers } = require('./tabs');
const { createWindowOpenPolicy } = require('./window-open-policy');

const APP_ID = 'io.github.coletivo420.canva-linux';
const APP_URL = 'https://www.canva.com/';
const APP_NAME = 'Canva Linux';
const PARTITION = 'persist:canva';
const HOME_URL = APP_URL;
const TOOLBAR_HEIGHT = 46;
const WM_CLASS = APP_ID;
const APP_ICON_PATH = path.join(__dirname, '..', 'assets', 'canva-icon.png');
const APP_VERSION = app.getVersion();
const centralLogger = createCentralLogger({ app });
const { debugLevel, debugEnabled, debugLog } = createDebugTools({
  emit(category: string, args: unknown[]) {
    centralLogger.logDebug(category, args, { source: 'main' });
  },
});

type BrowserWindowInstance =
  import('./shell').BrowserWindowLike &
  import('./oauth').BrowserWindowLike &
  import('./logging-helpers').BrowserWindowLike;
type WebContentsViewInstance =
  import('./tabs').WebContentsViewLike &
  import('./shell').WebContentsViewLike;
type ElectronSession = import('./runtime').SessionLike;
type ElectronWebContents = import('electron').WebContents;
type TabEntry = import('./tabs').TabEntry;
type AuthPopupEntry = import('./oauth').OAuthPopupEntry;
type FindTabByWebContents = (webContents: Partial<Pick<ElectronWebContents, 'id'>> | null | undefined) => TabEntry | null;
type CreateHomeTab = () => TabEntry | null;

let mainWindow: BrowserWindowInstance | null = null;
let toolbarView: WebContentsViewInstance | null = null;
let activeTabId: number | null = null;
let nextTabId = 1;
let nextPopupId = 1;
const tabs = new Map<number, TabEntry>();
const authPopups = new Map<number, AuthPopupEntry>();
let canvaSession: ElectronSession | null = null;
let findTabByWebContents: FindTabByWebContents = () => null;
let createHomeTab: CreateHomeTab = () => null;

configureLinuxRuntime({
  app,
  appId: APP_ID,
  path,
  wmClass: WM_CLASS,
});

function getCanvaSession(): ElectronSession {
  if (!canvaSession) {
    canvaSession = session.fromPartition(PARTITION, { cache: true }) as ElectronSession;
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
  BrowserWindow: BrowserWindow as unknown as new (options: Record<string, unknown>) => import('./shell').BrowserWindowLike,
  debugLog,
  layoutViews() {
    return layoutViews();
  },
  nativeTheme,
  WebContentsView: WebContentsView as unknown as new (options: Record<string, unknown>) => import('./shell').WebContentsViewLike,
});
const { shellBackgroundColor } = shellHelpers;

const loggingHelpers = createLoggingHelpers({
  getMainWindow: () => mainWindow,
  getAuthPopups: () => authPopups as unknown as Map<number, import('./logging-helpers').OAuthPopupEntry>,
  getFindTabByWebContents: () => findTabByWebContents,
});
const { summarizeOauthEntry, webContentsLabel, windowLabel } = loggingHelpers;

const { classifyWindowOpenRequest } = createWindowOpenPolicy({
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
});

function makeToolbarUrl(): string {
  return `file://${path.join(__dirname, '..', 'ui', 'toolbar.html')}`;
}

function currentTheme(): 'dark' | 'light' {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function sharedWebPreferences(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return createSharedWebPreferences(getCanvaSession, extra);
}

const tabHelpers = createTabHelpers({
  appName: APP_NAME,
  broadcastTabsState,
  createHomeTab: () => createHomeTab(),
  debugLog,
  findTabByWebContentsRef(value: FindTabByWebContents) {
    findTabByWebContents = value;
  },
  getHomeUrl: () => HOME_URL,
  mainWindowRef: () => mainWindow,
  nativeTheme,
  setActiveTabId(value: number | null) {
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
  BrowserWindow: BrowserWindow as unknown as new (options: Record<string, unknown>) => import('./oauth').BrowserWindowLike,
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
  debugLog,
  detectCanvaOAuthCallback,
  extractHostname,
  flushSession: flushSession as unknown as (session: unknown) => Promise<void>,
  getActiveTab: () => (activeTabId === null ? undefined : tabs.get(activeTabId)) as unknown as import('./oauth').CanvaTabEntry | undefined,
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

function createShellWindow(): BrowserWindowInstance {
  return shellHelpers.createShellWindow({
    setMainWindow(value: import('./shell').BrowserWindowLike | null) {
      mainWindow = value as unknown as BrowserWindowInstance | null;
      if (!value) {
        toolbarView = null;
      }
    },
  }) as unknown as BrowserWindowInstance;
}

function ensureTopLevelView(view: WebContentsViewInstance | null | undefined): void {
  if (!mainWindow || !view) return;
  mainWindow.contentView.addChildView(view);
}

function createToolbarView(): WebContentsViewInstance {
  return shellHelpers.createToolbarView({
    broadcastTabsState,
    ensureTopLevelView: ensureTopLevelView as unknown as (view: import('./shell').WebContentsViewLike) => void,
    layoutViews,
    makeToolbarUrl,
    preloadPath: path.join(__dirname, '..', 'preload', 'toolbar.js'),
    setToolbarView(value: import('./shell').WebContentsViewLike) {
      toolbarView = value as unknown as WebContentsViewInstance;
    },
  }) as unknown as WebContentsViewInstance;
}

function layoutViews(): void {
  return tabHelpers.layoutViews();
}

function applyThemeToShell(): void {
  debugLog('app', 'theme-updated', currentTheme());
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(shellBackgroundColor());
  for (const entry of authPopups.values()) {
    if (!entry.window.isDestroyed()) {
      entry.window.setBackgroundColor(shellBackgroundColor());
    }
  }
}

function broadcastTabsState(): void {
  debugLog('tabs:state', 'state-broadcast', `active=${activeTabId}`, `count=${tabs.size}`);
  if (toolbarView && !toolbarView.webContents.isDestroyed()) {
    const state = tabHelpers.toolbarState();
    debugLog(
      'tabs:state',
      'state-broadcast-toolbar',
      `url=${toolbarView.webContents.getURL() || 'about:blank'}`,
      `theme=${state.theme}`,
      `titles=${state.tabs.map((tab: { id: number; title: string }) => `${tab.id}:${tab.title}`).join(' | ') || 'none'}`
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
  tabHelpers: tabHelpers as unknown as import('./tab-controller').TabHelpers,
  WebContentsView: WebContentsView as unknown as import('./tab-controller').WebContentsViewConstructorLike,
});
createHomeTab = tabController.createHomeTab as unknown as CreateHomeTab;

registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents: findTabByWebContents as unknown as import('./eyedropper-bridge').FindTabByWebContentsFn,
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
  configureSession: configureSession as unknown as (options: Record<string, unknown>) => Promise<unknown>,
  createShellWindow,
  createToolbarView,
  debugLog,
  debugLevel,
  flushSession: flushSession as unknown as (session: unknown) => Promise<void>,
  focusMainWindow() {
    mainWindow?.focus();
  },
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
