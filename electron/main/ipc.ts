"use strict";

type DebugLog = (category: string, ...args: unknown[]) => boolean;
type DebugEnabled = (category?: string) => boolean;
type IpcMainLike = {
  on(channel: string, listener: (...args: unknown[]) => void): void;
  handle(channel: string, listener: (...args: unknown[]) => unknown): void;
};
type CentralLoggerLike = {
  logDebug(
    category: string,
    args?: unknown[],
    options?: { source?: string },
  ): void;
};
type TabControllerLike = {
  switchToTab(id: number): void;
  closeTab(id: number): void;
  focusHomeTab(options?: { resetToHome?: boolean }): void;
};
type DebugPayload = { category?: unknown; args?: unknown; source?: unknown };
type ToolbarPayload = { id?: unknown };
type ToolbarMessage = { action?: unknown; payload?: ToolbarPayload };

// Keep main-process IPC routing out of the entrypoint so startup composition can
// stay declarative while IPC behavior remains easy to audit in one place.
function registerMainIpcHandlers({
  centralLogger,
  debugEnabled,
  debugLog,
  ipcMain,
  tabController,
}: {
  centralLogger: CentralLoggerLike;
  debugEnabled: DebugEnabled;
  debugLog: DebugLog;
  ipcMain: IpcMainLike;
  tabController: TabControllerLike;
}): void {
  ipcMain.on("wrapper:debug-log", (_event, payload = {}) => {
    const message = (payload || {}) as DebugPayload;
    const category =
      typeof message.category === "string" && message.category
        ? message.category
        : "app";
    const args = Array.isArray(message.args) ? message.args : [];
    const source =
      typeof message.source === "string" && message.source
        ? message.source
        : "preload";
    if (!debugEnabled(category)) return;
    centralLogger.logDebug(category, args, { source });
  });

  ipcMain.on("toolbar-action", (_event, message = {}) => {
    const toolbarMessage = (message || {}) as ToolbarMessage;
    const action =
      typeof toolbarMessage.action === "string" ? toolbarMessage.action : "";
    const payload = toolbarMessage.payload || {};
    debugLog("tabs:toolbar", "toolbar-action", action, payload);
    if (action === "switch-tab") {
      if (typeof payload.id === "number") tabController.switchToTab(payload.id);
      return;
    }
    if (action === "close-tab") {
      if (typeof payload.id === "number") tabController.closeTab(payload.id);
      return;
    }
    if (action === "go-home") {
      tabController.focusHomeTab({ resetToHome: true });
    }
  });
}

export { registerMainIpcHandlers };
