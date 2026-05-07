// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { registerAppLifecycle } = loadRuntimeModule("main/lifecycle");

function createLifecycleOptions({
  canvaSession = null,
  clearEphemeralSessionData,
  configureSession,
  credentialStoragePolicy = {
    backend: "kwallet6",
    mode: "persistent",
    security: "secure",
    partition: "persist:canva",
    cache: true,
    persistentLoginAvailable: true,
    warning: null,
  },
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

  const configureSessionFn =
    configureSession ||
    (async (options) => {
      calls.push(`configureSession:${options.partition}`);
      return {};
    });
  const clearEphemeralSessionDataFn =
    clearEphemeralSessionData ||
    (async (_session, onWarning) => {
      calls.push("clearEphemeralSessionData");
      if (typeof onWarning === "function") {
        calls.push("clearEphemeralSessionData:warning-callback-available");
      }
    });

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
        return canvaSession;
      },
      centralLogger: {
        initLogFile() {
          return "/tmp/current.log";
        },
        logStatus(category, level, message) {
          calls.push(`logStatus:${category}:${level}:${message}`);
        },
      },
      clearEphemeralSessionData: clearEphemeralSessionDataFn,
      configureSession: configureSessionFn,
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
      flushSession: async () => {
        calls.push("flushSession");
      },
      focusMainWindow() {
        calls.push("focusMainWindow");
      },
      getCanvaSession() {
        return {};
      },
      getCredentialStoragePolicy() {
        return credentialStoragePolicy;
      },
      logCredentialStoragePolicy(policy) {
        calls.push(`logCredentialStoragePolicy:${policy.mode}:${policy.partition}`);
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
      getSessionPartition() {
        return "persist:canva";
      },
      resolveCredentialStoragePolicy() {
        calls.push("resolveCredentialStoragePolicy");
        return credentialStoragePolicy;
      },
      setCredentialStoragePolicy(policy) {
        calls.push(`setCredentialStoragePolicy:${policy.mode}:${policy.partition}`);
      },
      async showEphemeralSessionWarning(policy) {
        calls.push(`showEphemeralSessionWarning:${policy.security}:${policy.partition}`);
      },
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


test("registerAppLifecycle flushes persistent sessions on shutdown", async () => {
  const { calls, listeners, options } = createLifecycleOptions({
    canvaSession: {},
  });

  registerAppLifecycle(options);
  await listeners.get("window-all-closed")();

  assert.equal(calls.includes("flushSession"), true);
  assert.equal(calls.includes("clearEphemeralSessionData"), false);
  assert.equal(calls.includes("quit"), true);
});

test("registerAppLifecycle clears ephemeral sessions instead of persistent flush", async () => {
  const { calls, listeners, options } = createLifecycleOptions({
    canvaSession: {},
    credentialStoragePolicy: {
      backend: "basic_text",
      mode: "ephemeral",
      security: "insecure-basic-text",
      partition: "canva-ephemeral",
      cache: false,
      persistentLoginAvailable: false,
      warning: "ephemeral warning",
    },
  });

  registerAppLifecycle(options);
  await listeners.get("window-all-closed")();

  assert.equal(calls.includes("clearEphemeralSessionData"), true);
  assert.equal(
    calls.includes("clearEphemeralSessionData:warning-callback-available"),
    true,
  );
  assert.equal(calls.includes("flushSession"), false);
  assert.equal(calls.includes("quit"), true);
});

test("registerAppLifecycle logs ephemeral cleanup warnings without crashing", async () => {
  const { calls, listeners, options } = createLifecycleOptions({
    canvaSession: {},
    clearEphemeralSessionData: async (_session, onWarning) => {
      calls.push("clearEphemeralSessionData");
      onWarning("clearCache", new Error("cache cleanup failed"));
    },
    credentialStoragePolicy: {
      backend: "unknown",
      mode: "ephemeral",
      security: "unknown",
      partition: "canva-ephemeral",
      cache: false,
      persistentLoginAvailable: false,
      warning: "ephemeral warning",
    },
  });

  registerAppLifecycle(options);
  await listeners.get("window-all-closed")();

  assert.equal(calls.includes("clearEphemeralSessionData"), true);
  assert.equal(
    calls.includes(
      "logStatus:session:warn:ephemeral-session-clear-clearCache-failed WARNING: cache cleanup failed",
    ),
    true,
  );
  assert.equal(calls.includes("quit"), true);
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


test("registerAppLifecycle shows the ephemeral session warning before Canva loads", async () => {
  const { calls, options } = createLifecycleOptions({
    credentialStoragePolicy: {
      backend: "basic_text",
      mode: "ephemeral",
      security: "insecure-basic-text",
      partition: "canva-ephemeral",
      cache: false,
      persistentLoginAvailable: false,
      warning: "ephemeral warning",
    },
    readyPromise: Promise.resolve(),
  });

  registerAppLifecycle(options);
  await new Promise((resolve) => setImmediate(resolve));

  const warningIndex = calls.indexOf(
    "showEphemeralSessionWarning:insecure-basic-text:canva-ephemeral",
  );
  const configureIndex = calls.indexOf("configureSession:canva-ephemeral");
  const shellIndex = calls.indexOf("createShellWindow");

  assert.notEqual(warningIndex, -1);
  assert.notEqual(configureIndex, -1);
  assert.notEqual(shellIndex, -1);
  assert.equal(calls.includes("configureSession:persist:canva"), false);
  assert.equal(warningIndex < configureIndex, true);
  assert.equal(configureIndex < shellIndex, true);
  assert.equal(calls.includes("createToolbarView"), true);
  assert.equal(calls.includes("createHomeTab"), true);
});

test("registerAppLifecycle shows the ephemeral warning for unknown storage", async () => {
  const { calls, options } = createLifecycleOptions({
    credentialStoragePolicy: {
      backend: "unknown",
      mode: "ephemeral",
      security: "unknown",
      partition: "canva-ephemeral",
      cache: false,
      persistentLoginAvailable: false,
      warning: "ephemeral warning",
    },
    readyPromise: Promise.resolve(),
  });

  registerAppLifecycle(options);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    calls.includes("showEphemeralSessionWarning:unknown:canva-ephemeral"),
    true,
  );
  assert.equal(calls.includes("createHomeTab"), true);
});


test("registerAppLifecycle does not warn for secure persistent credential storage", async () => {
  for (const backend of ["kwallet", "kwallet5", "kwallet6", "gnome_libsecret"]) {
    const { calls, options } = createLifecycleOptions({
      credentialStoragePolicy: {
        backend,
        mode: "persistent",
        security: "secure",
        partition: "persist:canva",
        cache: true,
        persistentLoginAvailable: true,
        warning: null,
      },
      readyPromise: Promise.resolve(),
    });

    registerAppLifecycle(options);
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(
      calls.some((call) => call.startsWith("showEphemeralSessionWarning:")),
      false,
    );
    assert.equal(calls.includes("configureSession:persist:canva"), true);
  }
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
  assert.equal(calls.includes("resolveCredentialStoragePolicy"), true);
  assert.equal(
    calls.includes("setCredentialStoragePolicy:persistent:persist:canva"),
    true,
  );
  assert.equal(
    calls.includes("logCredentialStoragePolicy:persistent:persist:canva"),
    true,
  );
  assert.equal(
    calls.some((call) => call.startsWith("showEphemeralSessionWarning:")),
    false,
  );
  assert.equal(calls.includes("debug:startup:session-configured"), true);
  assert.equal(calls.includes("createShellWindow"), true);
  assert.equal(calls.includes("createToolbarView"), true);
  assert.equal(calls.includes("createHomeTab"), true);
  assert.equal(calls.includes("quit"), false);
  assert.equal(listeners.has("activate"), true);
  assert.equal(listeners.has("nativeTheme:updated"), true);
});
