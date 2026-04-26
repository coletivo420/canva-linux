'use strict';

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
  debugSpec,
  flushSession,
  getCanvaSession,
  logCredentialStorageBackend,
  logReleaseStatus,
  nativeTheme,
  onThemeUpdated,
  partition,
  path,
  shouldGrantRemotePermission,
  tabController,
}) {
  app.whenReady().then(async () => {
    const logFilePath = centralLogger.initLogFile();
    debugLog('startup', 'when-ready', `platform=${process.platform}`, `wayland=${Boolean(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland')}`);
    debugLog('startup', 'debug-spec', debugSpec || 'disabled');
    centralLogger.logStatus('startup', 'ok', `debug-log-file ${logFilePath}`);
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
