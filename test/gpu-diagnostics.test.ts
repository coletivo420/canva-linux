// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  classifyGpuAcceleration,
  getGpuRuntimeEnvironment,
  serializeGpuFeatureStatus,
  serializeGpuRuntimeEnvironment,
} = loadRuntimeModule("main/gpu-diagnostics");

test("classifies Vulkan accelerated GPU status", () => {
  assert.equal(
    classifyGpuAcceleration({
      gpu_compositing: "enabled",
      webgl: "enabled",
      vulkan: "enabled",
    }),
    "accelerated-vulkan",
  );
});

test("classifies non-Vulkan accelerated GPU status", () => {
  assert.equal(
    classifyGpuAcceleration({
      gpu_compositing: "enabled",
      webgl: "enabled",
      vulkan: "disabled_off",
    }),
    "accelerated-non-vulkan",
  );
});

test("classifies software or disabled GPU status", () => {
  assert.equal(
    classifyGpuAcceleration({
      gpu_compositing: "disabled_software",
      webgl: "disabled_off",
      rasterization: "disabled_off",
      video_decode: "disabled_off",
      vulkan: "disabled_off",
    }),
    "software-or-disabled",
  );
});

test("serializes GPU feature status with unknown fallbacks", () => {
  assert.deepEqual(serializeGpuFeatureStatus({ webgl: "enabled" }), [
    "gpu_compositing=unknown",
    "webgl=enabled",
    "webgl2=unknown",
    "rasterization=unknown",
    "video_decode=unknown",
    "video_encode=unknown",
    "vulkan=unknown",
  ]);
});

test("reports selected runtime CLI GPU options", () => {
  assert.deepEqual(
    getGpuRuntimeEnvironment({
      gpuBackend: "software",
      forceX11: false,
      forceWayland: true,
      disableWaylandColorManager: true,
    }),
    {
      source: "runtime-cli",
      gpuBackend: "software",
      forceX11: false,
      forceWayland: true,
      disableWaylandColorManager: true,
      displayOverride: "wayland",
    },
  );
});

test("serializes selected runtime CLI GPU options", () => {
  assert.deepEqual(
    serializeGpuRuntimeEnvironment({
      source: "runtime-cli",
      gpuBackend: "vulkan",
      forceX11: false,
      forceWayland: false,
      disableWaylandColorManager: false,
      displayOverride: "auto",
    }),
    [
      "source=runtime-cli",
      "gpuBackend=vulkan",
      "displayOverride=auto",
      "forceX11=false",
      "forceWayland=false",
      "disableWaylandColorManager=false",
    ],
  );
});
