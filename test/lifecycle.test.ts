// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { registerAppLifecycle } = loadRuntimeModule("main/lifecycle");

function createLifecycleOptions({
  configureSession = async () => ({}),
  lockResult = true,
  readyPromise = new Promise(() => {}),
} = {}) {
  const listeners = new Map();
  const calls = [];
  const app = {
    requestSingleInstanceLock() {
      calls.push("requestSingleInstanceLock");
      return lockResult;
    },
    whenReady() {
      calls.push("whenReady");
      return readyPromise;
    },
    on(event, listener) {
      calls.push(`on:${event}`);
      listeners.set(event, listener);
    },
    quit() {
      calls.push("quit");
    },
  };

  return {
    calls,
    listeners,
    options: {
      app,
      BrowserWindow: {
        getAllWindows() {
          return [];
        },
      },
      canvaSessionRef() {
        return null;
      },
      centralLogger: {
        initLogFile() {
          return "/tmp/current.log";
        },
        logStatus(category, level, message) {
          calls.push(`logStatus:${category}:${level}:${message}`);
        },
      },
      configureSession,
      createShellWindow() {
        calls.push("createShellWindow");
      },
      createToolbarView() {
        calls.push("createToolbarView");
      },
      debugLog(category, ...args) {
        calls.push(`debug:${category}:${args.join(":")}`);
        return true;
      },
      debugLevel: 0,
      flushSession: async () => {},
      focusMainWindow() {
        calls.push("focusMainWindow");
      },
      getCanvaSession() {
        return {};
      },
      logCredentialStorageBackend() {
        calls.push("logCredentialStorageBackend");
      },
      logReleaseStatus() {
        calls.push("logReleaseStatus");
      },
      nativeTheme: {
        on(event, listener) {
          listeners.set(`nativeTheme:${event}`, listener);
        },
      },
      onThemeUpdated() {},
      partition: "persist:canva",
      path: {},
      shouldGrantRemotePermission() {
        return false;
      },
      tabController: {
        createHomeTab() {
          calls.push("createHomeTab");
        },
      },
    },
  };
}

test("registerAppLifecycle quits immediately when single instance lock is unavailable", () => {
  const { calls, listeners, options } = createLifecycleOptions({
    lockResult: false,
  });

  registerAppLifecycle(options);

  assert.deepEqual(calls, [
    "requestSingleInstanceLock",
    "debug:app:single-instance-lock-denied",
    "quit",
  ]);
  assert.equal(listeners.has("second-instance"), false);
  assert.equal(listeners.has("window-all-closed"), false);
});

test("registerAppLifecycle focuses the existing main window on second-instance", () => {
  const { calls, listeners, options } = createLifecycleOptions({
    lockResult: true,
  });

  registerAppLifecycle(options);
  listeners.get("second-instance")();

  assert.equal(calls.includes("requestSingleInstanceLock"), true);
  assert.equal(calls.includes("whenReady"), true);
  assert.equal(listeners.has("window-all-closed"), true);
  assert.deepEqual(calls.slice(-2), [
    "debug:app:second-instance",
    "focusMainWindow",
  ]);
});

test("registerAppLifecycle logs critical startup errors and quits", async () => {
  const startupError = new Error("configureSession exploded");
  const { calls, options } = createLifecycleOptions({
    configureSession: async () => {
      throw startupError;
    },
    readyPromise: Promise.resolve(),
  });

  registerAppLifecycle(options);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    calls.includes(
      "logStatus:startup:critical:startup failed: configureSession exploded",
    ),
    true,
  );
  assert.equal(calls.includes("quit"), true);
  assert.equal(calls.includes("createShellWindow"), false);
  assert.equal(calls.includes("createToolbarView"), false);
  assert.equal(calls.includes("createHomeTab"), false);
});

test("registerAppLifecycle keeps normal startup flow unchanged", async () => {
  const { calls, listeners, options } = createLifecycleOptions({
    readyPromise: Promise.resolve(),
  });

  registerAppLifecycle(options);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    calls.includes("logStatus:startup:ok:debug-log-file /tmp/current.log"),
    true,
  );
  assert.equal(calls.includes("debug:startup:session-configured"), true);
  assert.equal(calls.includes("createShellWindow"), true);
  assert.equal(calls.includes("createToolbarView"), true);
  assert.equal(calls.includes("createHomeTab"), true);
  assert.equal(calls.includes("quit"), false);
  assert.equal(listeners.has("activate"), true);
  assert.equal(listeners.has("nativeTheme:updated"), true);
});
