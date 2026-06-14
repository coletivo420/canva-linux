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
    options?: { source?: string; terminal?: boolean },
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
type HandleToolbarAction = (action: string, payload?: ToolbarPayload) => void;

// Keep main-process IPC routing out of the entrypoint so startup composition can
// stay declarative while IPC behavior remains easy to audit in one place.
function registerMainIpcHandlers({
  centralLogger,
  debugEnabled,
  debugLog,
  handleToolbarAction,
  ipcMain,
}: {
  centralLogger: CentralLoggerLike;
  debugEnabled: DebugEnabled;
  debugLog: DebugLog;
  handleToolbarAction: HandleToolbarAction;
  ipcMain: IpcMainLike;
  tabController?: TabControllerLike;
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
    centralLogger.logDebug(category, args, {
      source,
      terminal: debugEnabled(),
    });
  });

  ipcMain.on("toolbar-action", (_event, message = {}) => {
    const toolbarMessage = (message || {}) as ToolbarMessage;
    const action =
      typeof toolbarMessage.action === "string" ? toolbarMessage.action : "";
    const payload = toolbarMessage.payload || {};
    debugLog("tabs:toolbar", "toolbar-ipc-action", action, payload);
    handleToolbarAction(action, payload);
  });
}

export { registerMainIpcHandlers };
