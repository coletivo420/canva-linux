'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyGpuAcceleration,
  getGpuRuntimeEnvironment,
  serializeGpuFeatureStatus,
} = require('../electron/main/gpu-diagnostics');

test('classifies Vulkan accelerated GPU status', () => {
  assert.equal(
    classifyGpuAcceleration({
      gpu_compositing: 'enabled',
      webgl: 'enabled',
      vulkan: 'enabled',
    }),
    'accelerated-vulkan'
  );
});

test('classifies non-Vulkan accelerated GPU status', () => {
  assert.equal(
    classifyGpuAcceleration({
      gpu_compositing: 'enabled',
      webgl: 'enabled',
      vulkan: 'disabled_off',
    }),
    'accelerated-non-vulkan'
  );
});

test('classifies software or disabled GPU status', () => {
  assert.equal(
    classifyGpuAcceleration({
      gpu_compositing: 'disabled_software',
      webgl: 'disabled_off',
      rasterization: 'disabled_off',
      video_decode: 'disabled_off',
      vulkan: 'disabled_off',
    }),
    'software-or-disabled'
  );
});

test('serializes GPU feature status with unknown fallbacks', () => {
  assert.deepEqual(serializeGpuFeatureStatus({ webgl: 'enabled' }), [
    'gpu_compositing=unknown',
    'webgl=enabled',
    'webgl2=unknown',
    'rasterization=unknown',
    'video_decode=unknown',
    'video_encode=unknown',
    'vulkan=unknown',
  ]);
});

test('parses GPU runtime environment with fallbacks', () => {
  assert.deepEqual(getGpuRuntimeEnvironment({}), {
    backend: 'unknown',
    vendor: 'unknown',
    dri: 'unknown',
    display: 'unknown',
    disableGpu: '0',
    launcherReport: 'unavailable',
  });
});

test('parses GPU runtime environment from CANVA variables', () => {
  assert.deepEqual(
    getGpuRuntimeEnvironment({
      CANVA_GPU_BACKEND: 'auto',
      CANVA_GPU_VENDOR: 'nvidia',
      CANVA_GPU_DRI_RENDER_NODE: '1',
      CANVA_GPU_DISPLAY_SERVER: 'wayland',
      CANVA_DISABLE_GPU: '0',
      CANVA_GPU_LAUNCHER_REPORT: 'vendor=nvidia backend=auto dri=1 display=wayland',
    }),
    {
      backend: 'auto',
      vendor: 'nvidia',
      dri: '1',
      display: 'wayland',
      disableGpu: '0',
      launcherReport: 'vendor=nvidia backend=auto dri=1 display=wayland',
    }
  );
});
