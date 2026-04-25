'use strict';

// Keep main-process IPC routing out of the entrypoint so startup composition can
// stay declarative while IPC behavior remains easy to audit in one place.
function registerMainIpcHandlers({
  centralLogger,
  debugEnabled,
  debugLog,
  ipcMain,
  tabController,
}) {
  ipcMain.on('wrapper:debug-log', (_event, payload = {}) => {
    const category = payload.category || 'app';
    const args = Array.isArray(payload.args) ? payload.args : [];
    const source = payload.source || 'preload';
    if (!debugEnabled(category)) return;
    centralLogger.logDebug(category, args, { source });
  });

  ipcMain.on('toolbar-action', (_event, message = {}) => {
    const { action, payload = {} } = message || {};
    debugLog('tabs:toolbar', 'toolbar-action', action, JSON.stringify(payload));
    if (action === 'switch-tab') {
      tabController.switchToTab(payload.id);
      return;
    }
    if (action === 'close-tab') {
      tabController.closeTab(payload.id);
      return;
    }
    if (action === 'go-home') {
      tabController.focusHomeTab({ resetToHome: true });
    }
  });
}

module.exports = {
  registerMainIpcHandlers,
};
