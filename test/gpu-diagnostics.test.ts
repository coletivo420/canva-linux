// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  classifyGpuAcceleration,
  getGpuRuntimeEnvironment,
  serializeGpuFeatureStatus,
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

test("reports runtime CLI as the GPU runtime option source", () => {
  assert.deepEqual(getGpuRuntimeEnvironment(), {
    source: "runtime-cli",
  });
});
