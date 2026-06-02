// @ts-nocheck
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();

test("CL-EyeDropper module loads without runtime side effects", async () => {
  const before = Object.keys(globalThis);
  const contracts = await loadRuntimeModule("preload/cl-eyedropper/index");
  const after = Object.keys(globalThis);

  assert.equal(typeof contracts.CLEyeDropper, "function");
  assert.deepEqual(after, before);
});

test("CL-EyeDropper implementation does not import LTCode or mutate globalThis", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources/electron/preload/cl-eyedropper/cl-eyedropper.ts"),
    "utf8",
  );
  const removedModuleName = ["ltcode", "eyedropper"].join("-");

  assert.equal(source.includes(removedModuleName), false);
  assert.equal(source.includes("globalThis"), false);
});
