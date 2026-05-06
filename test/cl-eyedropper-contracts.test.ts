// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

test("CL-EyeDropper module loads without runtime side effects", () => {
  const before = Object.keys(globalThis);
  const contracts = loadRuntimeModule("preload/cl-eyedropper/index");
  const after = Object.keys(globalThis);

  assert.equal(typeof contracts.CLEyeDropper, "function");
  assert.deepEqual(after, before);
});

test("CL-EyeDropper implementation does not import LTCode or mutate globalThis", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "electron/preload/cl-eyedropper/cl-eyedropper.ts"),
    "utf8",
  );
  const removedModuleName = ["ltcode", "eyedropper"].join("-");

  assert.equal(source.includes(removedModuleName), false);
  assert.equal(source.includes("globalThis"), false);
});
