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
type DebugPayload = { category?: unknown; args?: unknown; source?: unknown };
type HandleToolbarReady = () => void;

// Keep main-process IPC routing out of the entrypoint so startup composition can
// stay declarative while IPC behavior remains easy to audit in one place.
function registerMainIpcHandlers({
  centralLogger,
  debugEnabled,
  debugLog,
  handleToolbarReady,
  ipcMain,
}: {
  centralLogger: CentralLoggerLike;
  debugEnabled: DebugEnabled;
  debugLog: DebugLog;
  handleToolbarReady: HandleToolbarReady;
  ipcMain: IpcMainLike;
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

  ipcMain.on("toolbar-ready", () => {
    debugLog("tabs:toolbar", "toolbar-ready");
    handleToolbarReady();
  });
}

export { registerMainIpcHandlers };
