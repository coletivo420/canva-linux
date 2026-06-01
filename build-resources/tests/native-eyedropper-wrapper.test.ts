// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const { isWrappedEyeDropperInstalledInScope } = require("./helpers/runtime-module").loadRuntimeModule(
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
