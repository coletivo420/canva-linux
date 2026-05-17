// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  describeTarget,
  installEyeDropperRoutingDiagnostics,
  normalizeHex: normalizeRoutingHex,
  serializeValue,
  summarizeStream,
} = loadRuntimeModule("preload/eyedropper-routing-diagnostics");



function createDiagnosticsOptions(logs) {
  return {
    debugEnabled(category) {
      return category === "eyedropper" || category === "eyedropper:routing";
    },
    debugLog(...args) {
      logs.push(["debug", ...args]);
      return true;
    },
    logEyeDropper(...args) {
      logs.push(["eye", ...args]);
    },
  };
}

async function withMediaDeviceScope(mediaDevices, fn) {
  const previousNavigator = globalThis.navigator;
  const previousMediaDevices = globalThis.MediaDevices;
  const previousWindow = globalThis.window;
  const previousLocation = globalThis.location;
  const previousProcessIsMainFrame = process.isMainFrame;
  const previousInstalled = globalThis.__canvaEyeDropperRoutingDiagnosticsInstalled;

  function MediaDevices() {}
  MediaDevices.prototype = Object.getPrototypeOf(mediaDevices);

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { mediaDevices },
  });
  globalThis.MediaDevices = MediaDevices;
  globalThis.window = { addEventListener() {} };
  globalThis.location = { href: "https://www.canva.com/design" };
  process.isMainFrame = true;
  delete globalThis.__canvaEyeDropperRoutingDiagnosticsInstalled;

  try {
    return await fn();
  } finally {
    if (previousNavigator === undefined) {
      delete globalThis.navigator;
    } else {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: previousNavigator,
      });
    }
    if (previousMediaDevices === undefined) delete globalThis.MediaDevices;
    else globalThis.MediaDevices = previousMediaDevices;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousLocation === undefined) delete globalThis.location;
    else globalThis.location = previousLocation;
    if (previousProcessIsMainFrame === undefined) delete process.isMainFrame;
    else process.isMainFrame = previousProcessIsMainFrame;
    if (previousInstalled === undefined) delete globalThis.__canvaEyeDropperRoutingDiagnosticsInstalled;
    else globalThis.__canvaEyeDropperRoutingDiagnosticsInstalled = previousInstalled;
  }
}

const { installNativeEyeDropperWrapper, isWrappedEyeDropperInstalledInScope } =
  loadRuntimeModule("preload/native-eyedropper-wrapper");

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function withElectronMock(fn) {
  const moduleLoader =
    /** @type {typeof Module & { _load: (request: string, parent: unknown, isMain: boolean) => unknown }} */ Module;
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function mockElectron(request, parent, isMain) {
    if (request === "electron") {
      return {
        ipcRenderer: {
          invoke() {
            return Promise.resolve(null);
          },
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return fn();
  } finally {
    moduleLoader._load = originalLoad;
  }
}

const {
  createAbortError,
  createOperationError,
  normalizeHex: normalizeCustomHex,
} = withElectronMock(() => loadRuntimeModule("preload/custom-eyedropper-flow"));

test("normalizes EyeDropper hex values", () => {
  assert.equal(normalizeRoutingHex("#AABBCC"), "#aabbcc");
  assert.equal(normalizeRoutingHex("aabbcc"), "#aabbcc");
  assert.equal(normalizeRoutingHex("bad"), null);
  assert.equal(normalizeCustomHex("#AABBCC"), "#aabbcc");
  assert.equal(normalizeCustomHex("aabbcc"), "#aabbcc");
  assert.equal(normalizeCustomHex("bad"), null);
});

test("serializes values safely", () => {
  assert.equal(serializeValue(undefined), "undefined");
  assert.equal(serializeValue(null), "null");
  assert.equal(serializeValue({ video: true }), '{"video":true}');

  /** @type {{ self?: unknown }} */
  const circular = {};
  circular.self = circular;
  assert.equal(serializeValue(circular), "[unserializable]");
});

test("describes targets", () => {
  assert.equal(
    describeTarget({
      tagName: "BUTTON",
      id: "pick",
      className: "primary active extra ignored",
    }),
    "button#pick.primary.active.extra",
  );
  assert.equal(describeTarget(null), "unknown");
});

test("summarizes media streams", () => {
  assert.equal(summarizeStream(null), "no-tracks");
  assert.equal(summarizeStream({ getTracks: () => [] }), "no-tracks");
  assert.equal(
    summarizeStream({
      getTracks: () => [
        { kind: "video", readyState: "live", label: "screen" },
        { kind: "audio", readyState: "ended" },
      ],
    }),
    "video:live:screen,audio:ended",
  );
});

test("creates DOMException-compatible EyeDropper errors", () => {
  assert.equal(createAbortError().name, "AbortError");
  assert.equal(createOperationError().name, "OperationError");
});

test("detects wrapped EyeDropper installation in a scope", () => {
  function WrappedEyeDropper() {}

  assert.equal(
    isWrappedEyeDropperInstalledInScope({
      __canvaWrappedEyeDropperInstalled: true,
    }),
    true,
  );
  assert.equal(
    isWrappedEyeDropperInstalledInScope({
      __canvaWrappedEyeDropper: WrappedEyeDropper,
      EyeDropper: WrappedEyeDropper,
    }),
    true,
  );
  assert.equal(
    isWrappedEyeDropperInstalledInScope({ EyeDropper: WrappedEyeDropper }),
    true,
  );
  assert.equal(isWrappedEyeDropperInstalledInScope({}), false);
});

test("native wrapper exports installer shape", () => {
  const wrapper = installNativeEyeDropperWrapper({
    logEyeDropper() {},
    wrapOpenCall() {
      return Promise.resolve({ sRGBHex: "#000000" });
    },
  });
  assert.equal(typeof wrapper.ensureWrappedEyeDropperInstalled, "function");
});


test("MediaDevices diagnostics preserve receiver for normal and detached calls", async () => {
  const stream = { getTracks: () => [{ kind: "audio", readyState: "live", label: "mic" }] };
  const calls = [];
  const mediaDevices = {
    getUserMedia(constraints) {
      assert.equal(this, mediaDevices);
      calls.push(["getUserMedia", constraints]);
      return Promise.resolve(stream);
    },
    getDisplayMedia(constraints) {
      assert.equal(this, mediaDevices);
      calls.push(["getDisplayMedia", constraints]);
      return Promise.resolve(stream);
    },
  };
  const logs = [];

  await withMediaDeviceScope(mediaDevices, async () => {
    installEyeDropperRoutingDiagnostics(createDiagnosticsOptions(logs));
    await mediaDevices.getUserMedia({ audio: true });
    const detachedUserMedia = mediaDevices.getUserMedia;
    await detachedUserMedia({ video: true });
    const detachedDisplayMedia = mediaDevices.getDisplayMedia;
    await detachedDisplayMedia({ video: { cursor: "always" } });
  });

  assert.deepEqual(calls.map((call) => call[0]), [
    "getUserMedia",
    "getUserMedia",
    "getDisplayMedia",
  ]);
  assert.equal(
    logs.some((entry) => entry.includes("getUserMedia-call")),
    true,
  );
  assert.equal(
    logs.some((entry) => entry.includes("getDisplayMedia-resolved")),
    true,
  );
});

test("MediaDevices diagnostics log rejections without sensitive constraint values", async () => {
  const mediaDevices = {
    getUserMedia() {
      assert.equal(this, mediaDevices);
      return Promise.reject(new Error("Permission denied"));
    },
  };
  const logs = [];

  await withMediaDeviceScope(mediaDevices, async () => {
    installEyeDropperRoutingDiagnostics(createDiagnosticsOptions(logs));
    const detachedUserMedia = mediaDevices.getUserMedia;
    await assert.rejects(
      () => detachedUserMedia({ token: "secret", audio: true }),
      /Permission denied/,
    );
  });

  const flattenedLogs = JSON.stringify(logs);
  assert.equal(flattenedLogs.includes("getUserMedia-rejected"), true);
  assert.equal(flattenedLogs.includes("secret"), false);
});
