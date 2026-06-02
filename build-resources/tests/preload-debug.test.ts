// @ts-nocheck

import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule, withElectronMock } from "./helpers/runtime-module.js";

const { normalizeEyeDropperCategoryHint } = await withElectronMock(
  { ipcRenderer: { send() {} } },
  () => loadRuntimeModule("preload/debug"),
);

test("normalizes EyeDropper category hints", () => {
  assert.equal(normalizeEyeDropperCategoryHint("bridge"), "eyedropper:bridge");
  assert.equal(normalizeEyeDropperCategoryHint("flow"), "eyedropper:flow");
  assert.equal(
    normalizeEyeDropperCategoryHint("wrapper"),
    "eyedropper:wrapper",
  );
  assert.equal(
    normalizeEyeDropperCategoryHint("routing"),
    "eyedropper:routing",
  );
  assert.equal(
    normalizeEyeDropperCategoryHint("capture"),
    "eyedropper:routing",
  );
  assert.equal(
    normalizeEyeDropperCategoryHint("library"),
    "eyedropper:library",
  );
  assert.equal(normalizeEyeDropperCategoryHint("lib"), "eyedropper:library");
  assert.equal(normalizeEyeDropperCategoryHint("invalid"), null);
});
