
import assert from "node:assert/strict";
import test from "node:test";

import { loadRuntimeModule } from "./helpers/runtime-module.js";

const {
  normalizeHex,
  createAbortError,
  createOperationError,
} = await loadRuntimeModule(
  "preload/custom-eyedropper-flow",
);

test("normalizeHex accepts #RRGGBB and RRGGBB", () => {
  assert.equal(normalizeHex("#AABBCC"), "#aabbcc");
  assert.equal(normalizeHex("AABBCC"), "#aabbcc");
  assert.equal(normalizeHex("#xyz"), null);
});

test("createAbortError returns AbortError", () => {
  const error = createAbortError();
  assert.equal(error.name, "AbortError");
});

test("createOperationError returns OperationError", () => {
  const error = createOperationError("fail");
  assert.equal(error.name, "OperationError");
});
