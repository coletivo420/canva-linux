import { configureLinuxNativeCredentialStore } from "./linux-credential-runtime";
import type { CanvaLinuxRuntimeCliOptions, RuntimeDebugLevel } from "./runtime-cli";

type DebugLog = (category: string, ...args: unknown[]) => boolean;
type CommandLineLike = {
  appendSwitch(name: string, value?: string): void;
  getSwitchValue(name: string): string;
};
type ElectronAppLike = {
  commandLine: CommandLineLike;
  disableHardwareAcceleration?: () => void;
  getPath(name: string): string;
  setDesktopName?: (name: string) => void;
  setName?: (name: string) => void;
  setPath(name: string, path: string): void;
  setAppUserModelId?: (id: string) => void;
};
type WebContentsLike = { getURL(): string };
type PermissionDetailsLike = {
  requestingOrigin?: string;
  requestingUrl?: string;
};
type BeforeSendHeadersDetailsLike = { requestHeaders: Record<string, string> };
type DownloadItemLike = {
  getFilename(): string;
  setSavePath(path: string): void;
};
type SessionLike = {
  partition?: string;
  cookies: { flushStore?(): Promise<void> };
  clearCache?: () => Promise<void>;
  clearStorageData?: () => Promise<void>;
  flushStorageData(): Promise<void> | void;
  setPermissionRequestHandler(
    handler: (
      webContents: WebContentsLike | null | undefined,
      permission: string,
      callback: (granted: boolean) => void,
      details?: PermissionDetailsLike,
    ) => void,
  ): void;
  setPermissionCheckHandler(
    handler: (
      webContents: WebContentsLike | null | undefined,
      permission: string,
      requestingOrigin?: string,
      details?: PermissionDetailsLike,
    ) => boolean,
  ): void;
  webRequest: {
    onBeforeSendHeaders(
      handler: (
        details: BeforeSendHeadersDetailsLike,
        callback: (response: {
          requestHeaders: Record<string, string>;
        }) => void,
      ) => void,
    ): void;
  };
  on(
    event: "will-download",
    listener: (event: unknown, item: DownloadItemLike) => void,
  ): void;
};
type PathLike = Pick<typeof import("node:path"), "basename" | "join">;

function sanitizeDownloadFilename(filename: string, path: PathLike): string {
  const baseName = path
    .basename(String(filename || ""))
    .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "_")
    .trim();
  if (!baseName || baseName === "." || baseName === "..") return "download";
  return baseName;
}

function appendDisableFeature(app: ElectronAppLike, featureName: string): void {
  const switchName = "disable-features";
  const currentValue = app.commandLine.getSwitchValue(switchName);
  const features = new Set(
    String(currentValue || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  features.add(featureName);
  app.commandLine.appendSwitch(switchName, Array.from(features).join(","));
}


function detectRuntimeDisplayServer(env = process.env): "wayland" | "x11" | "unknown" {
  if (env.WAYLAND_DISPLAY || env.XDG_SESSION_TYPE === "wayland") return "wayland";
  if (env.DISPLAY || env.XDG_SESSION_TYPE === "x11") return "x11";
  return "unknown";
}

function applyRuntimeGpuCli({
  app,
  runtimeCli,
  detectedDisplayServer,
}: {
  app: ElectronAppLike;
  runtimeCli: CanvaLinuxRuntimeCliOptions;
  detectedDisplayServer?: "wayland" | "x11" | "unknown";
}): void {
  const displayServer = detectedDisplayServer || detectRuntimeDisplayServer();

  switch (runtimeCli.gpuBackend) {
    case "auto":
      app.commandLine.appendSwitch("enable-gpu-rasterization");
      app.commandLine.appendSwitch("enable-zero-copy");
      break;
    case "opengl":
      app.commandLine.appendSwitch("enable-gpu-rasterization");
      app.commandLine.appendSwitch("enable-zero-copy");
      app.commandLine.appendSwitch("use-gl", "angle");
      app.commandLine.appendSwitch("use-angle", "gl");
      break;
    case "vulkan":
      app.commandLine.appendSwitch("enable-gpu-rasterization");
      app.commandLine.appendSwitch("enable-zero-copy");
      app.commandLine.appendSwitch(
        "enable-features",
        "Vulkan,VulkanFromANGLE,DefaultANGLEVulkan",
      );
      app.commandLine.appendSwitch("use-angle", "vulkan");
      break;
    case "force":
      app.commandLine.appendSwitch("enable-gpu-rasterization");
      app.commandLine.appendSwitch("enable-zero-copy");
      app.commandLine.appendSwitch("ignore-gpu-blocklist");
      app.commandLine.appendSwitch("use-gl", "angle");
      app.commandLine.appendSwitch("use-angle", "gl");
      break;
    case "software":
      app.disableHardwareAcceleration?.();
      app.commandLine.appendSwitch("disable-gpu");
      app.commandLine.appendSwitch("disable-gpu-compositing");
      break;
  }

  if (runtimeCli.forceX11) {
    app.commandLine.appendSwitch("ozone-platform", "x11");
  } else if (runtimeCli.forceWayland) {
    if (displayServer !== "wayland") {
      throw new Error("--force-wayland was set, but no Wayland session was detected.");
    }
    app.commandLine.appendSwitch("ozone-platform", "wayland");
  } else if (displayServer === "wayland") {
    app.commandLine.appendSwitch("ozone-platform", "wayland");
  }

  if (runtimeCli.disableWaylandColorManager) {
    appendDisableFeature(app, "WaylandWpColorManagerV1");
  }
}

function configureLinuxRuntime({
  app,
  appId,
  wmClass,
  path,
  runtimeCli = {
    help: false,
    version: false,
    debugLevel: 0,
    credentialStore: "auto",
    gpuBackend: "auto",
    forceX11: false,
    forceWayland: false,
    disableWaylandColorManager: false,
    passthroughArgs: [],
  },
}: {
  app: ElectronAppLike;
  appId: string;
  wmClass: string;
  path: PathLike;
  runtimeCli?: CanvaLinuxRuntimeCliOptions;
}): void {
  app.setName?.("Canva Linux");
  app.commandLine.appendSwitch("disable-component-update");
  app.commandLine.appendSwitch("disable-domain-reliability");
  app.commandLine.appendSwitch("disable-sync");
  app.commandLine.appendSwitch("metrics-recording-only");
  app.commandLine.appendSwitch("no-first-run");
  app.commandLine.appendSwitch("no-default-browser-check");
  // Reduces non-fatal Bluetooth/Floss log noise in Flatpak; does not disable system Bluetooth.
  appendDisableFeature(app, "Floss");

  if (process.platform === "linux") {
    app.setDesktopName?.(`${appId}.desktop`);
    configureLinuxNativeCredentialStore({
      app,
      credentialStore: runtimeCli.credentialStore,
      debugLevel: runtimeCli.debugLevel,
    });
    app.commandLine.appendSwitch("class", wmClass);
    app.commandLine.appendSwitch("font-render-hinting", "medium");
    app.commandLine.appendSwitch("enable-font-antialiasing");
    applyRuntimeGpuCli({
      app,
      runtimeCli,
      detectedDisplayServer: detectRuntimeDisplayServer(),
    });
  }

  if (shouldEnableCaptureVerboseLogging(runtimeCli.debugLevel)) {
    app.commandLine.appendSwitch("enable-logging");
    app.commandLine.appendSwitch("v", "1");
    app.commandLine.appendSwitch(
      "vmodule",
      [
        "*desktop_capture*=3",
        "*screen_capture*=3",
        "*webrtc*=2",
        "*pipewire*=2",
      ].join(","),
    );
  }

  app.setPath("sessionData", path.join(app.getPath("userData"), "session"));
}

function shouldEnableCaptureVerboseLogging(
  debugLevel: RuntimeDebugLevel,
): boolean {
  return debugLevel === 2;
}

async function flushSession(ses: SessionLike): Promise<void> {
  await ses.cookies.flushStore?.();
  await ses.flushStorageData();
}

type EphemeralSessionClearWarning = (
  operation: string,
  error: unknown,
) => void;

async function clearEphemeralSessionData(
  ses: SessionLike,
  onWarning?: EphemeralSessionClearWarning,
): Promise<void> {
  await ses.clearStorageData?.().catch((error: unknown) => {
    onWarning?.("clearStorageData", error);
  });
  await ses.clearCache?.().catch((error: unknown) => {
    onWarning?.("clearCache", error);
  });
  await ses.cookies.flushStore?.().catch((error: unknown) => {
    onWarning?.("cookies.flushStore", error);
  });
}

function sharedWebPreferences(
  getCanvaSession: () => SessionLike,
  extra: Record<string, unknown> = {},
): Record<string, unknown> & {
  session: SessionLike;
  contextIsolation: boolean;
  sandbox: boolean;
  nodeIntegration: boolean;
  spellcheck: boolean;
} {
  // All Canva surfaces (tabs + OAuth popups) must share the same session.
  return {
    session: getCanvaSession(),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    spellcheck: true,
    ...extra,
  };
}

async function configureSession({
  app,
  debugLog,
  flushSessionFn = flushSession,
  getCanvaSession,
  path,
  partition,
  shouldGrantRemotePermission,
}: {
  app: Pick<ElectronAppLike, "getPath">;
  debugLog: DebugLog;
  flushSessionFn?: (session: SessionLike) => Promise<void>;
  getCanvaSession: () => SessionLike;
  path: PathLike;
  partition: string;
  shouldGrantRemotePermission: (
    permission: string,
    origin: string,
    details: PermissionDetailsLike,
  ) => boolean;
}): Promise<SessionLike> {
  const ses = getCanvaSession();
  debugLog("session", "configure", partition);

  ses.setPermissionRequestHandler(
    (webContents, permission, callback, details = {}) => {
      const origin =
        details.requestingOrigin ||
        details.requestingUrl ||
        webContents?.getURL() ||
        "";
      const granted = shouldGrantRemotePermission(permission, origin, details);

      debugLog(
        "permissions",
        "request",
        permission,
        granted ? "allow" : "deny",
        origin || "unknown",
      );
      if (permission === "fileSystem") {
        debugLog(
          "upload",
          "permission-request",
          permission,
          granted ? "allow" : "deny",
          origin || "unknown",
        );
      }

      callback(granted);
    },
  );

  ses.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details = {}) => {
      const origin =
        requestingOrigin ||
        details.requestingUrl ||
        webContents?.getURL() ||
        "";
      const granted = shouldGrantRemotePermission(permission, origin, details);

      debugLog(
        "permissions",
        "check",
        permission,
        granted ? "allow" : "deny",
        origin || "unknown",
      );
      if (permission === "fileSystem") {
        debugLog(
          "upload",
          "permission-check",
          permission,
          granted ? "allow" : "deny",
          origin || "unknown",
        );
      }

      return granted;
    },
  );

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders.DNT = "1";
    callback({ requestHeaders: details.requestHeaders });
  });

  ses.on("will-download", (_event, item) => {
    const filename = sanitizeDownloadFilename(item.getFilename(), path);
    debugLog("upload", "will-download", filename);
    const downloadsDir = app.getPath("downloads");
    item.setSavePath(path.join(downloadsDir, filename));
  });

  await flushSessionFn(ses).catch((error: unknown) => {
    debugLog("session", "flush-error", String(error));
  });
  return ses;
}

export {
  applyRuntimeGpuCli,
  clearEphemeralSessionData,
  configureLinuxRuntime,
  configureSession,
  flushSession,
  sanitizeDownloadFilename,
  sharedWebPreferences,
  shouldEnableCaptureVerboseLogging,
};

export type { SessionLike };
