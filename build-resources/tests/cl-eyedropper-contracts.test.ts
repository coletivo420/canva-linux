import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const indexPath = path.join(
  repoRoot,
  "build-resources/electron/preload/cl-eyedropper/index.ts",
);
const implementationPath = path.join(
  repoRoot,
  "build-resources/electron/preload/cl-eyedropper/cl-eyedropper.ts",
);
const customFlowPath = path.join(
  repoRoot,
  "build-resources/electron/preload/custom-eyedropper-flow.ts",
);

function read(relativeOrAbsolutePath: string): string {
  return fs.readFileSync(relativeOrAbsolutePath, "utf8");
}

test("CL-EyeDropper module loads without runtime side effects", async () => {
  const before = Object.keys(globalThis);
  const contracts = await loadRuntimeModule("preload/cl-eyedropper/index");
  const after = Object.keys(globalThis);

  assert.equal(typeof contracts.CLEyeDropper, "function");
  assert.deepEqual(after, before);
});

test("CL-EyeDropper implementation does not import LTCode or mutate globalThis", () => {
  const source = read(implementationPath);
  const removedModuleName = ["ltcode", "eyedropper"].join("-");

  assert.equal(source.includes(removedModuleName), false);
  assert.equal(source.includes("globalThis"), false);
});

test("cl-eyedropper/index.ts exports CLEyeDropper", () => {
  assert.match(read(indexPath), /export\s*{[\s\S]*\bCLEyeDropper\b/);
});

test("cl-eyedropper/index.ts exports installClEyeDropperScalingPatch", () => {
  assert.match(read(indexPath), /export\s*{[\s\S]*\binstallClEyeDropperScalingPatch\b/);
});

test("cl-eyedropper/index.ts exports removeClEyeDropperUi", () => {
  assert.match(read(indexPath), /export\s*{[\s\S]*\bremoveClEyeDropperUi\b/);
});

test("installClEyeDropperScalingPatch is idempotent via __canvaScalingPatchInstalled", () => {
  const source = read(implementationPath);

  assert.match(source, /__canvaScalingPatchInstalled\?\s*:\s*boolean/);
  assert.match(source, /if\s*\(\s*patchedClass\.__canvaScalingPatchInstalled\s*\)\s*return/);
  assert.match(source, /patchedClass\.__canvaScalingPatchInstalled\s*=\s*true/);
});

test("patched _onMouseMove uses getBoundingClientRect scale", () => {
  const source = read(implementationPath);

  assert.match(source, /function getScaledCanvasPosition[\s\S]*getBoundingClientRect\(\)/);
  assert.match(source, /scaleX[\s\S]*width\s*\/\s*Math\.max\(1,\s*rect\.width\)/);
  assert.match(source, /scaleY[\s\S]*height\s*\/\s*Math\.max\(1,\s*rect\.height\)/);
});

test("patched _onMouseMove clamps x/y to canvas bounds", () => {
  const source = read(implementationPath);

  assert.match(source, /Math\.max\(\s*0,\s*Math\.min\(width\s*-\s*1/);
  assert.match(source, /Math\.max\(\s*0,\s*Math\.min\(height\s*-\s*1/);
});

test("patched _onMouseMove stores _currentPosition", () => {
  assert.match(read(implementationPath), /this\._currentPosition\s*=\s*{\s*x,\s*y\s*}/);
});

test("patched _onMouseMove stores _lastPixel", () => {
  assert.match(read(implementationPath), /this\._lastPixel\s*=\s*{[\s\S]*hex:\s*hexColor[\s\S]*rgb:\s*\[r,\s*g,\s*b\]/);
});

test("patched _onMouseMove lowercases hex", () => {
  assert.match(read(implementationPath), /this\._rgbToHex\(r,\s*g,\s*b\)\.toLowerCase\(\)/);
});

test("patched _onClick falls back to scaled position when _lastPixel is missing", () => {
  assert.match(read(implementationPath), /if\s*\(\s*!picked[\s\S]*getScaledCanvasPosition\(this,\s*event\)/);
});

test("patched _onClick resolves { hex, rgb }", () => {
  assert.match(read(implementationPath), /this\._resolve\(\s*{\s*hex:\s*picked\.hex,\s*rgb:\s*picked\.rgb\s*}\s*\)/);
});

test("patched _onClick calls _removeUI or removeClEyeDropperUi", () => {
  assert.match(read(implementationPath), /this\._removeUI\(\)|removeClEyeDropperUi\(\)/);
});

test("CLEyeDropper._removeUI removes eyedropper-overlay", () => {
  assert.match(read(implementationPath), /this\._container\.parentNode\.removeChild\(this\._container\)/);
});

test("CLEyeDropper._removeUI resets cursor", () => {
  assert.match(read(implementationPath), /this\._canvas\.style\.cursor\s*=\s*"default"/);
});

test("CLEyeDropper._removeUI removes mousemove/mouseleave/mouseenter/click listeners", () => {
  const source = read(implementationPath);

  for (const eventName of ["mousemove", "mouseleave", "mouseenter", "click"]) {
    assert.match(source, new RegExp(`removeEventListener\\("${eventName}"`));
  }
});

test("CLEyeDropper._removeUI clears magnifier/canvas/cache references", () => {
  const source = read(implementationPath);

  for (const fragment of [
    "this._canvas = null",
    "this._magnifier = null",
    "this._canvasCache = null",
    "this._magnifierCache = null",
    "this._magCanvas = null",
    "this._magCtx = null",
  ]) {
    assert.ok(source.includes(fragment), `missing cleanup fragment: ${fragment}`);
  }
});

test("removeClEyeDropperUi removes #eyedropper-overlay", () => {
  const source = read(implementationPath);

  assert.match(source, /document\.getElementById\("eyedropper-overlay"\)/);
  assert.match(source, /overlay\.parentNode\.removeChild\(overlay\)/);
});

test("custom flow imports CLEyeDropper from ./cl-eyedropper/index.js", () => {
  assert.match(read(customFlowPath), /from\s+"\.\/cl-eyedropper\/index\.js"/);
});

test("custom flow calls installClEyeDropperScalingPatch before opening picker", () => {
  const source = read(customFlowPath);
  const patchIndex = source.indexOf("installClEyeDropperScalingPatch");
  const openIndex = source.indexOf("eyedropper.open(canvas)");

  assert.ok(patchIndex >= 0);
  assert.ok(openIndex > patchIndex);
});

test("custom flow obtains ipcRenderer through loadElectronPreloadApi", () => {
  assert.match(read(customFlowPath), /const\s*{\s*ipcRenderer\s*}\s*=\s*await\s+loadElectronPreloadApi\(\)/);
});

test("custom flow invokes wrapper:eyedropper-snapshot", () => {
  assert.match(read(customFlowPath), /ipcRenderer\.invoke\([\s\S]*"wrapper:eyedropper-snapshot"[\s\S]*\)/);
});

test("custom flow creates data-canva-eyedropper-host", () => {
  assert.match(read(customFlowPath), /setAttribute\("data-canva-eyedropper-host",\s*"true"\)/);
});

test("custom flow uses zIndex 2147483647 for picker overlay", () => {
  assert.match(read(customFlowPath), /zIndex:\s*2147483647/);
});

test("custom flow handles Escape as AbortError", () => {
  const source = read(customFlowPath);

  assert.match(source, /event\.key\s*===\s*"Escape"/);
  assert.match(source, /finishReject\(createAbortError\(\)\)/);
});

test("custom flow normalizes result to sRGBHex", () => {
  assert.match(read(customFlowPath), /finishResolve\(\s*{\s*sRGBHex:\s*hex\s*}\s*\)/);
});

test("custom flow rejects invalid color as OperationError", () => {
  assert.match(read(customFlowPath), /createOperationError\(\s*"The color picker library did not return a valid color\."/);
});

test("custom flow prevents concurrent active picker sessions", () => {
  assert.match(read(customFlowPath), /if\s*\(\s*activePickerCleanup\s*\)\s*{[\s\S]*A color picker is already active\./);
});

test("custom flow cleans host and event listeners in success, abort and failure paths", () => {
  const source = read(customFlowPath);

  assert.match(source, /const cleanup = \(\) => {[\s\S]*removeClEyeDropperUi\(\);[\s\S]*host\.remove\(\);[\s\S]*window\.removeEventListener\("keydown",\s*onKeyDown,\s*true\);[\s\S]*}/);
  assert.match(source, /finishResolve[\s\S]*cleanup\(\);[\s\S]*resolve/);
  assert.match(source, /finishReject[\s\S]*cleanup\(\);[\s\S]*reject/);
});
