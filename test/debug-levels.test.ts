// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { createDebugTools, normalizeDebugLevel } = loadRuntimeModule("shared/debug");

test("normalizes unsupported debug levels to disabled", () => {
  assert.equal(normalizeDebugLevel(0), 0);
  assert.equal(normalizeDebugLevel(1), 1);
  assert.equal(normalizeDebugLevel(2), 2);
  assert.equal(normalizeDebugLevel("2"), 0);
  assert.equal(normalizeDebugLevel(3), 0);
});

test("debug tools use explicit runtime CLI debug level", () => {
  const events = [];
  const tools = createDebugTools({
    debugLevel: 1,
    emit(category, args) {
      events.push([category, args]);
    },
  });

  assert.equal(tools.getDebugLevel(), 1);
  assert.equal(tools.isDebugEnabled(), true);
  assert.equal(tools.debugLog("GPU.Runtime", "hello"), true);
  assert.deepEqual(events, [["gpu:runtime", ["hello"]]]);
});

test("debug tools are disabled at level 0", () => {
  const events = [];
  const tools = createDebugTools({
    debugLevel: 0,
    emit(category, args) {
      events.push([category, args]);
    },
  });

  assert.equal(tools.getDebugLevel(), 0);
  assert.equal(tools.isDebugEnabled(), false);
  assert.equal(tools.debugLog("gpu", "hidden"), false);
  assert.deepEqual(events, []);
});
