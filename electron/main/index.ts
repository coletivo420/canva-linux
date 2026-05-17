import path from "path";

import {
  app,
  safeStorage,
  dialog,
  BrowserWindow,
  WebContentsView,
  shell,
  session,
  ipcMain,
  nativeTheme,
} from "electron";

import { createDebugTools } from "../shared/debug";
import {
  classifyWindowOpenRequest as sharedClassifyWindowOpenRequest,
  detectCanvaOAuthCallback,
  extractHostname,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isOAuthProviderUrl,
  isCanvaUrl,
  isSafeExternalUrl,
  shouldGrantRemotePermission,
} from "../shared/navigation";

import { registerEyeDropperBridge } from "./eyedropper-bridge";
import {
  applyCanvaLinuxRuntimeCliEarly,
  parseCanvaLinuxRuntimeCli,
  printCanvaLinuxRuntimeHelp,
} from "./runtime-cli";
import { registerGpuDiagnostics as registerGpuDiagnosticsModule } from "./gpu-diagnostics";
import { registerMainIpcHandlers } from "./ipc";
import { registerAppLifecycle } from "./lifecycle";
import { createCentralLogger, createStatusLogger } from "./logging";
import { createLoggingHelpers } from "./logging-helpers";
import {
  createCredentialStorageWarningCopy,
  createDefaultCredentialStoragePolicy,
  resolveCredentialStoragePolicy,
} from "./credential-storage";
import { createOAuthHelpers } from "./oauth";
import {
  clearEphemeralSessionData,
  configureLinuxRuntime,
  configureSession,
  flushSession,
  sharedWebPreferences as createSharedWebPreferences,
} from "./runtime";
import { createShellHelpers } from "./shell";
import { createTabController } from "./tab-controller";
import { createTabHelpers } from "./tabs";
import { createWindowOpenPolicy } from "./window-open-policy";

const APP_ID = "io.github.coletivo420.canva-linux";
const APP_URL = "https://www.canva.com/";
const APP_NAME = "Canva Linux";
const TOOLBAR_HEIGHT = 46;
const WM_CLASS = APP_ID;
const APP_ICON_PATH = path.join(__dirname, "..", "assets", "canva-icon.png");
const APP_VERSION = app.getVersion();
type RuntimeCli = ReturnType<typeof applyCanvaLinuxRuntimeCliEarly>;

function parseRuntimeCliOrExit(): RuntimeCli | null {
  try {
    return applyCanvaLinuxRuntimeCliEarly(
      parseCanvaLinuxRuntimeCli(process.argv),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return null;
  }
}

const runtimeCli = parseRuntimeCliOrExit();

if (!runtimeCli) {
  app.exit(1);
} else if (runtimeCli.help) {
  console.log(printCanvaLinuxRuntimeHelp());
  app.exit(0);
} else if (runtimeCli.version) {
  console.log(APP_VERSION);
  app.exit(0);
} else {
  startRuntime(runtimeCli);
}

function startRuntime(runtimeCli: RuntimeCli): void {
const centralLogger = createCentralLogger({ app });
const { debugLevel, debugEnabled, debugLog } = createDebugTools({
  debugLevel: runtimeCli.debugLevel,
  emit(category: string, args: unknown[]) {
    centralLogger.logDebug(category, args, { source: "main" });
  },
});

type BrowserWindowInstance = import("./shell").BrowserWindowLike &
  import("./oauth").BrowserWindowLike &
  import("./logging-helpers").BrowserWindowLike;
type WebContentsViewInstance = import("./tabs").WebContentsViewLike &
  import("./shell").WebContentsViewLike;
type ElectronSession = import("./runtime").SessionLike;
type ElectronWebContents = import("electron").WebContents;
type TabEntry = import("./tabs").TabEntry;
type AuthPopupEntry = import("./oauth").OAuthPopupEntry;
type FindTabByWebContents = (
  webContents: Partial<Pick<ElectronWebContents, "id">> | null | undefined,
) => TabEntry | null;
type CreateHomeTab = () => TabEntry | null;
type CredentialStoragePolicy = import("./credential-storage").CredentialStoragePolicy;

let mainWindow: BrowserWindowInstance | null = null;
let toolbarView: WebContentsViewInstance | null = null;
let activeTabId: number | null = null;
let nextTabId = 1;
let nextPopupId = 1;
const tabs = new Map<number, TabEntry>();
const authPopups = new Map<number, AuthPopupEntry>();
let canvaSession: ElectronSession | null = null;
let credentialStoragePolicy: CredentialStoragePolicy =
  createDefaultCredentialStoragePolicy();
let findTabByWebContents: FindTabByWebContents = () => null;
let createHomeTab: CreateHomeTab = () => null;

configureLinuxRuntime({
  app,
  appId: APP_ID,
  path,
  runtimeCli,
  wmClass: WM_CLASS,
});


function showEphemeralSessionWarning(
  policy: CredentialStoragePolicy,
): Promise<unknown> {
  const warningCopy = createCredentialStorageWarningCopy(policy);

  if (!warningCopy) {
    return Promise.resolve();
  }

  return dialog.showMessageBox({
    type: "warning",
    ...warningCopy,
    buttons: ["Continue with ephemeral session"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
}

function getCanvaSession(): ElectronSession {
  if (!canvaSession) {
    canvaSession = session.fromPartition(credentialStoragePolicy.partition, {
      cache: credentialStoragePolicy.cache,
    }) as ElectronSession;
  }
  return canvaSession;
}

const { logCredentialStoragePolicy, logReleaseStatus } = createStatusLogger({
  app,
  appVersion: APP_VERSION,
  debugLog,
  logStatus: centralLogger.logStatus,
});

const shellHelpers = createShellHelpers({
  appIconPath: APP_ICON_PATH,
  appName: APP_NAME,
  BrowserWindow: BrowserWindow as unknown as new (
    options: Record<string, unknown>,
  ) => import("./shell").BrowserWindowLike,
  debugLog,
  layoutViews() {
    return layoutViews();
  },
  nativeTheme,
  WebContentsView: WebContentsView as unknown as new (
    options: Record<string, unknown>,
  ) => import("./shell").WebContentsViewLike,
});
const { shellBackgroundColor } = shellHelpers;

const loggingHelpers = createLoggingHelpers({
  getMainWindow: () => mainWindow,
  getAuthPopups: () =>
    authPopups as unknown as Map<
      number,
      import("./logging-helpers").OAuthPopupEntry
    >,
  getFindTabByWebContents: () => findTabByWebContents,
});
const { summarizeOauthEntry, webContentsLabel, windowLabel } = loggingHelpers;

const { classifyWindowOpenRequest } = createWindowOpenPolicy({
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
});

function makeToolbarUrl(): string {
  return `file://${path.join(__dirname, "..", "ui", "toolbar.html")}`;
}

function currentTheme(): "dark" | "light" {
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
}

function sharedWebPreferences(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
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
  getHomeUrl: () => APP_URL,
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
  BrowserWindow: BrowserWindow as unknown as new (
    options: Record<string, unknown>,
  ) => import("./oauth").BrowserWindowLike,
  classifyNavigationRequest: sharedClassifyWindowOpenRequest,
  debugLog,
  detectCanvaOAuthCallback,
  extractHostname,
  flushSession: flushSession as unknown as (session: unknown) => Promise<void>,
  getActiveTab: () =>
    (activeTabId === null ? undefined : tabs.get(activeTabId)) as unknown as
      | import("./oauth").CanvaTabEntry
      | undefined,
  getSourceTabByWebContentsId(sourceWebContentsId) {
    if (sourceWebContentsId === null) return undefined;

    for (const tab of tabs.values()) {
      if (tab.view.webContents.id === sourceWebContentsId) {
        return tab as unknown as import("./oauth").CanvaTabEntry;
      }
    }

    return undefined;
  },
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
    setMainWindow(value: import("./shell").BrowserWindowLike | null) {
      mainWindow = value as unknown as BrowserWindowInstance | null;
      if (!value) {
        toolbarView = null;
      }
    },
  }) as unknown as BrowserWindowInstance;
}

function ensureTopLevelView(
  view: WebContentsViewInstance | null | undefined,
): void {
  if (!mainWindow || !view) return;
  mainWindow.contentView.addChildView(view);
}

function createToolbarView(): WebContentsViewInstance {
  return shellHelpers.createToolbarView({
    broadcastTabsState,
    ensureTopLevelView: ensureTopLevelView as unknown as (
      view: import("./shell").WebContentsViewLike,
    ) => void,
    layoutViews,
    makeToolbarUrl,
    preloadPath: path.join(__dirname, "..", "preload", "toolbar.js"),
    setToolbarView(value: import("./shell").WebContentsViewLike) {
      toolbarView = value as unknown as WebContentsViewInstance;
    },
  }) as unknown as WebContentsViewInstance;
}

function layoutViews(): void {
  return tabHelpers.layoutViews();
}

function applyThemeToShell(): void {
  debugLog("app", "theme-updated", currentTheme());
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(shellBackgroundColor());
  for (const entry of authPopups.values()) {
    if (!entry.window.isDestroyed()) {
      entry.window.setBackgroundColor(shellBackgroundColor());
    }
  }
}

function broadcastTabsState(): void {
  debugLog(
    "tabs:state",
    "state-broadcast",
    `active=${activeTabId}`,
    `count=${tabs.size}`,
  );
  if (toolbarView && !toolbarView.webContents.isDestroyed()) {
    const state = tabHelpers.toolbarState();
    debugLog(
      "tabs:state",
      "state-broadcast-toolbar",
      `url=${toolbarView.webContents.getURL() || "about:blank"}`,
      `theme=${state.theme}`,
      `titles=${state.tabs.map((tab: { id: number; title: string }) => `${tab.id}:${tab.title}`).join(" | ") || "none"}`,
    );
    toolbarView.webContents.send("tabs-state", state);
  } else {
    debugLog(
      "tabs:state",
      "state-broadcast-skipped",
      `toolbarExists=${toolbarView ? "true" : "false"}`,
      `toolbarDestroyed=${toolbarView?.webContents?.isDestroyed?.() ? "true" : "false"}`,
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
  homeUrl: APP_URL,
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
  tabHelpers: tabHelpers as unknown as import("./tab-controller").TabHelpers,
  WebContentsView:
    WebContentsView as unknown as import("./tab-controller").WebContentsViewConstructorLike,
});
createHomeTab = tabController.createHomeTab as unknown as CreateHomeTab;

registerEyeDropperBridge({
  ipcMain,
  debugLog,
  webContentsLabel,
  findTabByWebContents:
    findTabByWebContents as unknown as import("./eyedropper-bridge").FindTabByWebContentsFn,
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
  clearEphemeralSessionData: clearEphemeralSessionData as unknown as (
    session: unknown,
    onWarning?: (operation: string, error: unknown) => void,
  ) => Promise<void>,
  configureSession: configureSession as unknown as (
    options: Record<string, unknown>,
  ) => Promise<unknown>,
  createShellWindow,
  createToolbarView,
  debugLog,
  debugLevel,
  flushSession: flushSession as unknown as (session: unknown) => Promise<void>,
  focusMainWindow() {
    mainWindow?.focus();
  },
  getCanvaSession,
  getCredentialStoragePolicy() {
    return credentialStoragePolicy;
  },
  logCredentialStoragePolicy,
  logReleaseStatus,
  nativeTheme,
  onThemeUpdated() {
    applyThemeToShell();
    broadcastTabsState();
  },
  getSessionPartition() {
    return credentialStoragePolicy.partition;
  },
  path,
  resolveCredentialStoragePolicy() {
    return resolveCredentialStoragePolicy({ safeStorage });
  },
  setCredentialStoragePolicy(policy: CredentialStoragePolicy) {
    credentialStoragePolicy = policy;
  },
  showEphemeralSessionWarning,
  registerGpuDiagnostics() {
    registerGpuDiagnosticsModule({
      app,
      centralLogger,
      debugLog: debugLog.bind(null, "gpu"),
      runtimeCli,
    });
  },
  shouldGrantRemotePermission,
  tabController,
});
}
