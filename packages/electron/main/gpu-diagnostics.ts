import type { CanvaLinuxRuntimeCliOptions } from "./runtime-cli";

type LogLevel = "ok" | "warn" | "critical";
type GpuAccelerationState =
  | "accelerated-vulkan"
  | "accelerated-non-vulkan"
  | "software-or-disabled";
type GpuFeatureStatus = {
  gpu_compositing?: unknown;
  webgl?: unknown;
  webgl2?: unknown;
  rasterization?: unknown;
  video_decode?: unknown;
  video_encode?: unknown;
  vulkan?: unknown;
};
type CentralLogger = {
  logStatus(
    category: string,
    level: LogLevel,
    message: string,
    options?: { source?: string },
  ): void;
  logDebug(
    category: string,
    args?: unknown[],
    options?: { source?: string; level?: LogLevel },
  ): void;
  getLogFilePath(): string | null;
};
type ChildProcessGoneDetails = {
  type?: string;
  reason?: string;
  exitCode?: number;
  name?: string;
  serviceName?: string;
};
type RenderProcessGoneDetails = {
  reason?: string;
  exitCode?: number;
};
type GpuDiagnosticsApp = {
  getGPUFeatureStatus(): GpuFeatureStatus;
  isHardwareAccelerationEnabled(): boolean;
  getGPUInfo(infoType: "basic" | "complete"): Promise<unknown>;
  on(event: "gpu-info-update", listener: () => void | Promise<void>): void;
  on(
    event: "child-process-gone",
    listener: (event: unknown, details?: ChildProcessGoneDetails) => void,
  ): void;
  on(
    event: "render-process-gone",
    listener: (
      event: unknown,
      webContents: { id?: number } | undefined,
      details?: RenderProcessGoneDetails,
    ) => void,
  ): void;
};
type StatusLogArg = string | number | boolean | null | undefined;
type RuntimeGpuOptions = Pick<
  CanvaLinuxRuntimeCliOptions,
  "gpuBackend" | "forceX11" | "forceWayland" | "disableWaylandColorManager"
>;
type RuntimeEnvironment = RuntimeGpuOptions & {
  source: "runtime-cli";
  displayOverride: "auto" | "x11" | "wayland";
};

function getGpuRuntimeEnvironment(
  runtimeCli: RuntimeGpuOptions,
): RuntimeEnvironment {
  return {
    source: "runtime-cli",
    gpuBackend: runtimeCli.gpuBackend,
    forceX11: runtimeCli.forceX11,
    forceWayland: runtimeCli.forceWayland,
    disableWaylandColorManager: runtimeCli.disableWaylandColorManager,
    displayOverride: runtimeCli.forceWayland
      ? "wayland"
      : runtimeCli.forceX11
        ? "x11"
        : "auto",
  };
}

function serializeGpuRuntimeEnvironment(
  environment: RuntimeEnvironment,
): string[] {
  return [
    `source=${environment.source}`,
    `gpuBackend=${environment.gpuBackend}`,
    `displayOverride=${environment.displayOverride}`,
    `forceX11=${environment.forceX11}`,
    `forceWayland=${environment.forceWayland}`,
    `disableWaylandColorManager=${environment.disableWaylandColorManager}`,
  ];
}

function serializeGpuFeatureStatus(status: GpuFeatureStatus = {}): string[] {
  return [
    `gpu_compositing=${status.gpu_compositing || "unknown"}`,
    `webgl=${status.webgl || "unknown"}`,
    `webgl2=${status.webgl2 || "unknown"}`,
    `rasterization=${status.rasterization || "unknown"}`,
    `video_decode=${status.video_decode || "unknown"}`,
    `video_encode=${status.video_encode || "unknown"}`,
    `vulkan=${status.vulkan || "unknown"}`,
  ];
}

function classifyGpuAcceleration(
  status: GpuFeatureStatus = {},
): GpuAccelerationState {
  const enabled = (value: unknown): boolean =>
    String(value || "").startsWith("enabled");

  const accelerated = [
    status.gpu_compositing,
    status.webgl,
    status.webgl2,
    status.rasterization,
    status.video_decode,
  ].some(enabled);

  const vulkanEnabled = enabled(status.vulkan);

  if (accelerated && vulkanEnabled) return "accelerated-vulkan";
  if (accelerated) return "accelerated-non-vulkan";
  return "software-or-disabled";
}

function createGpuLogger({ centralLogger }: { centralLogger: CentralLogger }) {
  function logGpu(
    level: LogLevel,
    category: string,
    event: string,
    ...args: StatusLogArg[]
  ): void {
    centralLogger.logStatus(category, level, [event, ...args].join(" "), {
      source: "gpu",
    });
  }

  // Use debugGpu for raw objects so central logger normalization can preserve structure safely.
  function debugGpu(category: string, event: string, ...args: unknown[]): void {
    centralLogger.logDebug(category, [event, ...args], { source: "gpu" });
  }

  return {
    logGpu,
    debugGpu,
  };
}

function registerGpuDiagnostics({
  app,
  centralLogger,
  debugLog,
  runtimeCli,
}: {
  app: GpuDiagnosticsApp;
  centralLogger: CentralLogger;
  debugLog: (...args: unknown[]) => void;
  runtimeCli: RuntimeGpuOptions;
}): void {
  const logFilePath = centralLogger.getLogFilePath() || "unavailable";
  const { logGpu, debugGpu } = createGpuLogger({ centralLogger });
  const runtimeEnv = getGpuRuntimeEnvironment(runtimeCli);

  logGpu("ok", "gpu:runtime", "central-log-file", logFilePath);
  logGpu(
    "ok",
    "gpu:runtime",
    "runtime-options",
    ...serializeGpuRuntimeEnvironment(runtimeEnv),
  );

  app.on("gpu-info-update", async () => {
    try {
      const featureStatus = app.getGPUFeatureStatus();
      const hardwareAccelerationEnabled = app.isHardwareAccelerationEnabled();

      const acceleration = classifyGpuAcceleration(featureStatus);

      logGpu(
        "ok",
        "gpu:features",
        "feature-status",
        `acceleration=${acceleration}`,
        `hardwareAcceleration=${hardwareAccelerationEnabled}`,
        ...serializeGpuFeatureStatus(featureStatus),
      );

      const gpuInfo = await app.getGPUInfo("basic");
      debugGpu("gpu:features", "info-basic", gpuInfo);
    } catch (error) {
      logGpu(
        "warn",
        "gpu:features",
        "feature-status-error",
        error instanceof Error ? error.message : String(error),
      );
    }
  });

  app.on("child-process-gone", (_event, details = {}) => {
    if (details.type !== "GPU") return;

    logGpu(
      details.reason === "clean-exit" ? "ok" : "warn",
      "gpu:process",
      "gpu-process-gone",
      `reason=${details.reason || "unknown"}`,
      `exitCode=${details.exitCode ?? "unknown"}`,
      `name=${details.name || "unknown"}`,
      `serviceName=${details.serviceName || "unknown"}`,
    );
  });

  app.on("render-process-gone", (_event, webContents, details = {}) => {
    logGpu(
      details.reason === "clean-exit" ? "ok" : "warn",
      "gpu:process",
      "render-process-gone",
      `reason=${details.reason || "unknown"}`,
      `exitCode=${details.exitCode ?? "unknown"}`,
      `webContents=${webContents?.id || "unknown"}`,
    );
  });

  debugLog(
    "gpu:runtime",
    "diagnostics-registered",
    `centralLog=${logFilePath}`,
  );
}

export {
  classifyGpuAcceleration,
  getGpuRuntimeEnvironment,
  serializeGpuFeatureStatus,
  serializeGpuRuntimeEnvironment,
  registerGpuDiagnostics,
};
