'use strict';

// @ts-check

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 * @typedef {(category?: string) => boolean} DebugEnabled
 * @typedef {{
 *   on(channel: string, listener: (...args: unknown[]) => void): void;
 *   handle(channel: string, listener: (...args: unknown[]) => unknown): void;
 * }} IpcMainLike
 * @typedef {{
 *   logDebug(category: string, args?: unknown[], options?: { source?: string }): void;
 * }} CentralLoggerLike
 * @typedef {{
 *   switchToTab(id: number): void;
 *   closeTab(id: number): void;
 *   focusHomeTab(options?: { resetToHome?: boolean }): void;
 * }} TabControllerLike
 */

// Keep main-process IPC routing out of the entrypoint so startup composition can
// stay declarative while IPC behavior remains easy to audit in one place.
/**
 * @param {{
 *   centralLogger: CentralLoggerLike;
 *   debugEnabled: DebugEnabled;
 *   debugLog: DebugLog;
 *   ipcMain: IpcMainLike;
 *   tabController: TabControllerLike;
 * }} options
 * @returns {void}
 */
function registerMainIpcHandlers({
  centralLogger,
  debugEnabled,
  debugLog,
  ipcMain,
  tabController,
}) {
  ipcMain.on('wrapper:debug-log', (_event, payload = {}) => {
    const message = /** @type {{ category?: unknown, args?: unknown, source?: unknown }} */ (payload || {});
    const category = typeof message.category === 'string' && message.category ? message.category : 'app';
    const args = Array.isArray(message.args) ? message.args : [];
    const source = typeof message.source === 'string' && message.source ? message.source : 'preload';
    if (!debugEnabled(category)) return;
    centralLogger.logDebug(category, args, { source });
  });

  ipcMain.on('toolbar-action', (_event, message = {}) => {
    const toolbarMessage = /** @type {{ action?: unknown, payload?: { id?: unknown } }} */ (message || {});
    const action = typeof toolbarMessage.action === 'string' ? toolbarMessage.action : '';
    const payload = toolbarMessage.payload || {};
    debugLog('tabs:toolbar', 'toolbar-action', action, payload);
    if (action === 'switch-tab') {
      if (typeof payload.id === 'number') tabController.switchToTab(payload.id);
      return;
    }
    if (action === 'close-tab') {
      if (typeof payload.id === 'number') tabController.closeTab(payload.id);
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
