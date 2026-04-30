'use strict';

// @ts-check

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 * @typedef {{
 *   whenReady(): Promise<void>;
 *   on(event: string, listener: (...args: any[]) => void): unknown;
 *   quit(): void;
 * }} AppLike
 * @typedef {{
 *   initLogFile(): string;
 *   logStatus(category: string, level: 'ok' | 'warn' | 'critical', message: string): void;
 * }} CentralLoggerLike
 * @typedef {{ getAllWindows(): unknown[] }} BrowserWindowConstructorLike
 * @typedef {{ on(event: 'updated', listener: () => void): unknown }} NativeThemeLike
 * @typedef {{ createHomeTab(): void }} TabControllerLike
 */

// Own app startup/shutdown wiring separately from main/index.js so the entry
// module can focus on assembling the runtime graph.
/**
 * @param {{
 *   app: AppLike;
 *   BrowserWindow: BrowserWindowConstructorLike;
 *   canvaSessionRef: () => unknown;
 *   centralLogger: CentralLoggerLike;
 *   configureSession: (options: Record<string, unknown>) => Promise<unknown>;
 *   createShellWindow: () => unknown;
 *   createToolbarView: () => unknown;
 *   debugLog: DebugLog;
 *   debugLevel: number;
 *   flushSession: (session: unknown) => Promise<void>;
 *   getCanvaSession: () => unknown;
 *   logCredentialStorageBackend: () => void;
 *   logReleaseStatus: () => void;
 *   nativeTheme: NativeThemeLike;
 *   onThemeUpdated: () => void;
 *   partition: string;
 *   path: unknown;
 *   registerGpuDiagnostics?: () => void;
 *   shouldGrantRemotePermission: (...args: any[]) => boolean;
 *   tabController: TabControllerLike;
 * }} options
 * @returns {void}
 */
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
}) {
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

module.exports = {
  registerAppLifecycle,
};
