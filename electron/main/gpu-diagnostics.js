'use strict';

// @ts-check

/**
 * @typedef {'ok' | 'warn' | 'critical'} LogLevel
 */

/**
 * @typedef {'accelerated-vulkan' | 'accelerated-non-vulkan' | 'software-or-disabled'} GpuAccelerationState
 */

/**
 * @typedef {{
 *   gpu_compositing?: unknown;
 *   webgl?: unknown;
 *   webgl2?: unknown;
 *   rasterization?: unknown;
 *   video_decode?: unknown;
 *   video_encode?: unknown;
 *   vulkan?: unknown;
 * }} GpuFeatureStatus
 */

/**
 * @typedef {{
 *   logStatus(category: string, level: LogLevel, message: string, options?: { source?: string }): void;
 *   logDebug(category: string, args?: unknown[], options?: { source?: string; level?: LogLevel }): void;
 *   getLogFilePath(): string | null;
 * }} CentralLogger
 */

/**
 * @typedef {{
 *   getGPUFeatureStatus(): GpuFeatureStatus;
 *   isHardwareAccelerationEnabled(): boolean;
 *   getGPUInfo(infoType: 'basic' | 'complete'): Promise<unknown>;
 *   on(event: 'gpu-info-update', listener: () => void | Promise<void>): void;
 *   on(event: 'child-process-gone', listener: (event: unknown, details?: ChildProcessGoneDetails) => void): void;
 *   on(event: 'render-process-gone', listener: (event: unknown, webContents: { id?: number } | undefined, details?: RenderProcessGoneDetails) => void): void;
 * }} GpuDiagnosticsApp
 */

/**
 * @typedef {{
 *   type?: string;
 *   reason?: string;
 *   exitCode?: number;
 *   name?: string;
 *   serviceName?: string;
 * }} ChildProcessGoneDetails
 */

/**
 * @typedef {{
 *   reason?: string;
 *   exitCode?: number;
 * }} RenderProcessGoneDetails
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   backend: string;
 *   vendor: string;
 *   dri: string;
 *   display: string;
 *   disableGpu: string;
 *   launcherReport: string;
 * }}
 */
function getGpuRuntimeEnvironment(env = process.env) {
  return {
    backend: env.CANVA_GPU_BACKEND || 'unknown',
    vendor: env.CANVA_GPU_VENDOR || 'unknown',
    dri: env.CANVA_GPU_DRI_RENDER_NODE || 'unknown',
    display: env.CANVA_GPU_DISPLAY_SERVER || 'unknown',
    disableGpu: env.CANVA_DISABLE_GPU || '0',
    launcherReport: env.CANVA_GPU_LAUNCHER_REPORT || 'unavailable',
  };
}

/**
 * @param {GpuFeatureStatus} [status]
 * @returns {string[]}
 */
function serializeGpuFeatureStatus(status = {}) {
  return [
    `gpu_compositing=${status.gpu_compositing || 'unknown'}`,
    `webgl=${status.webgl || 'unknown'}`,
    `webgl2=${status.webgl2 || 'unknown'}`,
    `rasterization=${status.rasterization || 'unknown'}`,
    `video_decode=${status.video_decode || 'unknown'}`,
    `video_encode=${status.video_encode || 'unknown'}`,
    `vulkan=${status.vulkan || 'unknown'}`,
  ];
}

/**
 * @param {GpuFeatureStatus} [status]
 * @returns {GpuAccelerationState}
 */
function classifyGpuAcceleration(status = {}) {
  /** @param {unknown} value */
  const enabled = (value) => String(value || '').startsWith('enabled');

  const accelerated = [
    status.gpu_compositing,
    status.webgl,
    status.webgl2,
    status.rasterization,
    status.video_decode,
  ].some(enabled);

  const vulkanEnabled = enabled(status.vulkan);

  if (accelerated && vulkanEnabled) return 'accelerated-vulkan';
  if (accelerated) return 'accelerated-non-vulkan';
  return 'software-or-disabled';
}

/**
 * @param {{ centralLogger: CentralLogger }} param0
 */
function createGpuLogger({ centralLogger }) {
  /** @param {LogLevel} level */
  function logGpu(level, category, event, ...args) {
    centralLogger.logStatus(category, level, [event, ...args].join(' '), { source: 'gpu' });
  }

  function debugGpu(category, event, ...args) {
    centralLogger.logDebug(category, [event, ...args], { source: 'gpu' });
  }

  return {
    logGpu,
    debugGpu,
  };
}

/**
 * @param {{ app: GpuDiagnosticsApp; centralLogger: CentralLogger; debugLog: (...args: unknown[]) => void }} param0
 */
function registerGpuDiagnostics({ app, centralLogger, debugLog }) {
  const logFilePath = centralLogger.getLogFilePath() || 'unavailable';
  const { logGpu, debugGpu } = createGpuLogger({ centralLogger });
  const runtimeEnv = getGpuRuntimeEnvironment();

  logGpu('ok', 'gpu:runtime', 'central-log-file', logFilePath);
  logGpu('ok', 'gpu:launcher', 'launcher-report', runtimeEnv.launcherReport);

  logGpu(
    'ok',
    'gpu:runtime',
    'runtime-env',
    `backend=${runtimeEnv.backend}`,
    `vendor=${runtimeEnv.vendor}`,
    `dri=${runtimeEnv.dri}`,
    `display=${runtimeEnv.display}`,
    `disableGpu=${runtimeEnv.disableGpu}`
  );

  app.on('gpu-info-update', async () => {
    try {
      const featureStatus = app.getGPUFeatureStatus();
      const hardwareAccelerationEnabled = app.isHardwareAccelerationEnabled();

      const acceleration = classifyGpuAcceleration(featureStatus);

      logGpu(
        'ok',
        'gpu:features',
        'feature-status',
        `acceleration=${acceleration}`,
        `hardwareAcceleration=${hardwareAccelerationEnabled}`,
        ...serializeGpuFeatureStatus(featureStatus)
      );

      const gpuInfo = await app.getGPUInfo('basic');
      debugGpu('gpu:features', 'info-basic', gpuInfo);
    } catch (error) {
      logGpu('warn', 'gpu:features', 'feature-status-error', error?.message || String(error));
    }
  });

  app.on('child-process-gone', (_event, details = {}) => {
    if (details.type !== 'GPU') return;

    logGpu(
      details.reason === 'clean-exit' ? 'ok' : 'warn',
      'gpu:process',
      'gpu-process-gone',
      `reason=${details.reason || 'unknown'}`,
      `exitCode=${details.exitCode ?? 'unknown'}`,
      `name=${details.name || 'unknown'}`,
      `serviceName=${details.serviceName || 'unknown'}`
    );
  });

  app.on('render-process-gone', (_event, webContents, details = {}) => {
    logGpu(
      details.reason === 'clean-exit' ? 'ok' : 'warn',
      'gpu:process',
      'render-process-gone',
      `reason=${details.reason || 'unknown'}`,
      `exitCode=${details.exitCode ?? 'unknown'}`,
      `webContents=${webContents?.id || 'unknown'}`
    );
  });

  debugLog('gpu:runtime', 'diagnostics-registered', `centralLog=${logFilePath}`);
}

module.exports = {
  classifyGpuAcceleration,
  getGpuRuntimeEnvironment,
  serializeGpuFeatureStatus,
  registerGpuDiagnostics,
};
