'use strict';

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

function classifyGpuAcceleration(status = {}) {
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

function createGpuLogger({ centralLogger }) {
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

function registerGpuDiagnostics({ app, centralLogger, debugLog }) {
  const logFilePath = centralLogger.getLogFilePath() || 'unavailable';
  const { logGpu, debugGpu } = createGpuLogger({ centralLogger });

  logGpu('ok', 'gpu:runtime', 'central-log-file', logFilePath);
  logGpu('ok', 'gpu:launcher', 'launcher-report', process.env.CANVA_GPU_LAUNCHER_REPORT || 'unavailable');

  logGpu(
    'ok',
    'gpu:runtime',
    'runtime-env',
    `backend=${process.env.CANVA_GPU_BACKEND || 'unknown'}`,
    `vendor=${process.env.CANVA_GPU_VENDOR || 'unknown'}`,
    `dri=${process.env.CANVA_GPU_DRI_RENDER_NODE || 'unknown'}`,
    `display=${process.env.CANVA_GPU_DISPLAY_SERVER || 'unknown'}`,
    `disableGpu=${process.env.CANVA_DISABLE_GPU || '0'}`
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
      debugGpu('gpu:features', 'info-basic', JSON.stringify(gpuInfo));
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
  registerGpuDiagnostics,
};
