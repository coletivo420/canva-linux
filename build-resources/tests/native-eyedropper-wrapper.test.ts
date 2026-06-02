
import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const { isWrappedEyeDropperInstalledInScope } = await loadRuntimeModule(
  "preload/native-eyedropper-wrapper",
);

test("isWrappedEyeDropperInstalledInScope detects wrapper", () => {
  function WrappedEyeDropper() {}
  const scopeA = {
    __canvaWrappedEyeDropperInstalled: true,
    EyeDropper: undefined,
    __canvaWrappedEyeDropper: undefined,
  };
  assert.equal(isWrappedEyeDropperInstalledInScope(scopeA), true);

  const scopeB = {
    EyeDropper: WrappedEyeDropper,
    __canvaWrappedEyeDropper: WrappedEyeDropper,
    __canvaWrappedEyeDropperInstalled: false,
  };
  assert.equal(isWrappedEyeDropperInstalledInScope(scopeB), true);

  const scopeC = {
    EyeDropper: function EyeDropper() {},
    __canvaWrappedEyeDropperInstalled: false,
  };
  assert.equal(isWrappedEyeDropperInstalledInScope(scopeC), false);
});
