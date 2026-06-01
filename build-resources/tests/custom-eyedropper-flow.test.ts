// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  normalizeHex,
  createAbortError,
  createOperationError,
} = require("./helpers/runtime-module").loadRuntimeModule(
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
