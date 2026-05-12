import type { SessionLike } from "./runtime";

type DebugLog = (category: string, ...args: unknown[]) => boolean;
type AppLike = {
  requestSingleInstanceLock(): boolean;
  whenReady(): Promise<void>;
  on(event: string, listener: (...args: any[]) => void): unknown;
  quit(): void;
};
type CentralLoggerLike = {
  initLogFile(): string;
  logStatus(
    category: string,
    level: "ok" | "warn" | "critical",
    message: string,
  ): void;
};
type ClearEphemeralSessionData = (
  session: SessionLike,
  onWarning?: (operation: string, error: unknown) => void,
) => Promise<void>;
type BrowserWindowConstructorLike = { getAllWindows(): unknown[] };
type NativeThemeLike = { on(event: "updated", listener: () => void): unknown };
type TabControllerLike = { createHomeTab(): void };
type CredentialStoragePolicy = import("./credential-storage").CredentialStoragePolicy;
type LifecycleOptions = {
  app: AppLike;
  BrowserWindow: BrowserWindowConstructorLike;
  canvaSessionRef: () => SessionLike | null | undefined;
  centralLogger: CentralLoggerLike;
  clearEphemeralSessionData: ClearEphemeralSessionData;
  configureSession: (options: Record<string, unknown>) => Promise<unknown>;
  createShellWindow: () => unknown;
  createToolbarView: () => unknown;
  debugLog: DebugLog;
  debugLevel: number;
  flushSession: (session: SessionLike) => Promise<void>;
  focusMainWindow: () => void;
  getCanvaSession: () => SessionLike;
  getCredentialStoragePolicy: () => CredentialStoragePolicy;
  logCredentialStoragePolicy: (policy: CredentialStoragePolicy) => void;
  logReleaseStatus: () => void;
  nativeTheme: NativeThemeLike;
  onThemeUpdated: () => void;
  getSessionPartition: () => string;
  path: unknown;
  registerGpuDiagnostics?: () => void;
  resolveCredentialStoragePolicy: () => CredentialStoragePolicy;
  setCredentialStoragePolicy: (policy: CredentialStoragePolicy) => void;
  showEphemeralSessionWarning?: (policy: CredentialStoragePolicy) => Promise<unknown>;
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
  clearEphemeralSessionData,
  configureSession,
  createShellWindow,
  createToolbarView,
  debugLog,
  debugLevel,
  flushSession,
  focusMainWindow,
  getCanvaSession,
  getCredentialStoragePolicy,
  logCredentialStoragePolicy,
  logReleaseStatus,
  nativeTheme,
  onThemeUpdated,
  getSessionPartition,
  path,
  registerGpuDiagnostics,
  resolveCredentialStoragePolicy,
  setCredentialStoragePolicy,
  showEphemeralSessionWarning = async () => {},
  shouldGrantRemotePermission,
  tabController,
}: LifecycleOptions): void {
  if (!app.requestSingleInstanceLock()) {
    debugLog("app", "single-instance-lock-denied");
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    debugLog("app", "second-instance");
    focusMainWindow();
  });

  function startupErrorMessage(error: unknown): string {
    return error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
      ? error.message
      : String(error);
  }

  async function bootApplication(): Promise<void> {
    const logFilePath = centralLogger.initLogFile();
    debugLog(
      "startup",
      "when-ready",
      `platform=${process.platform}`,
      `wayland=${Boolean(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === "wayland")}`,
    );
    debugLog("startup", "debug-level", String(debugLevel || 0));
    centralLogger.logStatus("startup", "ok", `debug-log-file ${logFilePath}`);
    if (typeof registerGpuDiagnostics === "function") {
      registerGpuDiagnostics();
    }
    logReleaseStatus();
    const credentialStoragePolicy = resolveCredentialStoragePolicy();
    setCredentialStoragePolicy(credentialStoragePolicy);
    logCredentialStoragePolicy(credentialStoragePolicy);
    if (credentialStoragePolicy.mode === "ephemeral") {
      await showEphemeralSessionWarning(credentialStoragePolicy);
      debugLog(
        "session",
        "ephemeral-warning-confirmed",
        `backend=${credentialStoragePolicy.backend}`,
        `security=${credentialStoragePolicy.security}`,
      );
    }
    await configureSession({
      app,
      debugLog,
      getCanvaSession,
      path,
      partition: credentialStoragePolicy.partition,
      shouldGrantRemotePermission,
    });
    debugLog("startup", "session-configured");
    createShellWindow();
    createToolbarView();
    tabController.createHomeTab();

    nativeTheme.on("updated", () => {
      onThemeUpdated();
    });

    app.on("activate", () => {
      debugLog("app", "activate");
      if (BrowserWindow.getAllWindows().length === 0) {
        createShellWindow();
        createToolbarView();
        tabController.createHomeTab();
      }
    });
  }

  function handleStartupError(error: unknown): void {
    const message = `startup failed: ${startupErrorMessage(error)}`;
    try {
      centralLogger.logStatus("startup", "critical", message);
    } catch {
      console.error(`[canva:main:startup:critical] ${message}`);
    }

    if (debugLevel > 0 && error instanceof Error && error.stack) {
      debugLog("startup", "startup-error-stack", error.stack);
    }

    app.quit();
  }

  app.whenReady().then(bootApplication).catch(handleStartupError);

  app.on("window-all-closed", async () => {
    debugLog("app", "window-all-closed");
    debugLog("session", "shutdown-session", getSessionPartition());
    const canvaSession = canvaSessionRef();
    if (canvaSession) {
      const credentialStoragePolicy = getCredentialStoragePolicy();
      if (credentialStoragePolicy.mode === "ephemeral") {
        debugLog(
          "session",
          "clear-ephemeral-before-quit",
          credentialStoragePolicy.partition,
        );
        await clearEphemeralSessionData(
          canvaSession,
          (operation, error) => {
            centralLogger.logStatus(
              "session",
              "warn",
              `ephemeral-session-clear-${operation}-failed WARNING: ${startupErrorMessage(error)}`,
            );
          },
        ).catch((error) => {
          centralLogger.logStatus(
            "session",
            "warn",
            `ephemeral-session-clear-failed WARNING: ${startupErrorMessage(error)}`,
          );
        });
      } else {
        await flushSession(canvaSession).catch(() => {});
      }
    }
    if (process.platform !== "darwin") app.quit();
  });
}

export { registerAppLifecycle };
