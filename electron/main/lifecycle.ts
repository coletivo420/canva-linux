'use strict';

type DebugLog = (category: string, ...args: unknown[]) => boolean;
type AppLike = {
  requestSingleInstanceLock(): boolean;
  whenReady(): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): unknown;
  quit(): void;
};
type CentralLoggerLike = {
  initLogFile(): string;
  logStatus(category: string, level: 'ok' | 'warn' | 'critical', message: string): void;
};
type BrowserWindowConstructorLike = { getAllWindows(): unknown[] };
type NativeThemeLike = { on(event: 'updated', listener: () => void): unknown };
type TabControllerLike = { createHomeTab(): void };
type LifecycleOptions = {
  app: AppLike;
  BrowserWindow: BrowserWindowConstructorLike;
  canvaSessionRef: () => unknown;
  centralLogger: CentralLoggerLike;
  configureSession: (options: Record<string, unknown>) => Promise<unknown>;
  createShellWindow: () => unknown;
  createToolbarView: () => unknown;
  debugLog: DebugLog;
  debugLevel: number;
  flushSession: (session: any) => Promise<void>;
  focusMainWindow: () => void;
  getCanvaSession: () => unknown;
  logCredentialStorageBackend: () => void;
  logReleaseStatus: () => void;
  nativeTheme: NativeThemeLike;
  onThemeUpdated: () => void;
  partition: string;
  path: unknown;
  registerGpuDiagnostics?: () => void;
  shouldGrantRemotePermission: (...args: any[]) => boolean;
  tabController: TabControllerLike;
};

// Own app startup/shutdown wiring separately from main/index.js so the entry
// module can focus on assembling the runtime graph.
function registerAppLifecycle({
  app,
  BrowserWindow,
  canvaSessionRef,
  centralLogger,
  configureSession,
  createShellWindow,
  createToolbarView,
  debugLog,
  debugLevel,
  flushSession,
  focusMainWindow,
  getCanvaSession,
  logCredentialStorageBackend,
  logReleaseStatus,
  nativeTheme,
  onThemeUpdated,
  partition,
  path,
  registerGpuDiagnostics,
  shouldGrantRemotePermission,
  tabController,
}: LifecycleOptions): void {
  if (!app.requestSingleInstanceLock()) {
    debugLog('app', 'single-instance-lock-denied');
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    debugLog('app', 'second-instance');
    focusMainWindow();
  });

  app.whenReady().then(async () => {
    const logFilePath = centralLogger.initLogFile();
    debugLog('startup', 'when-ready', `platform=${process.platform}`, `wayland=${Boolean(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland')}`);
    debugLog('startup', 'debug-level', String(debugLevel || 0));
    centralLogger.logStatus('startup', 'ok', `debug-log-file ${logFilePath}`);
    if (typeof registerGpuDiagnostics === 'function') {
      registerGpuDiagnostics();
    }
    logReleaseStatus();
    logCredentialStorageBackend();
    await configureSession({
      app,
      debugLog,
      getCanvaSession,
      path,
      partition,
      shouldGrantRemotePermission,
    });
    debugLog('startup', 'session-configured');
    createShellWindow();
    createToolbarView();
    tabController.createHomeTab();

    nativeTheme.on('updated', () => {
      onThemeUpdated();
    });

    app.on('activate', () => {
      debugLog('app', 'activate');
      if (BrowserWindow.getAllWindows().length === 0) {
        createShellWindow();
        createToolbarView();
        tabController.createHomeTab();
      }
    });
  });

  app.on('window-all-closed', async () => {
    debugLog('app', 'window-all-closed');
    debugLog('session', 'flush-before-quit', partition);
    const canvaSession = canvaSessionRef();
    if (canvaSession) {
      await flushSession(canvaSession).catch(() => {});
    }
    if (process.platform !== 'darwin') app.quit();
  });
}

export {
  registerAppLifecycle,
};
