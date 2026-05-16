// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  clearEphemeralSessionData,
  configureSession,
  sanitizeDownloadFilename,
  sharedWebPreferences,
  shouldEnableCaptureVerboseLogging,
} = loadRuntimeModule("main/runtime");

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

/**
 * @param {{ CANVA_DEBUG?: string, CANVA_DEBUG_LEVEL?: string }} env
 * @param {() => void} fn
 */
function withDebugEnv(env, fn) {
  const previousDebug = process.env.CANVA_DEBUG;
  const previousLevel = process.env.CANVA_DEBUG_LEVEL;
  try {
    if ("CANVA_DEBUG" in env) process.env.CANVA_DEBUG = env.CANVA_DEBUG;
    else delete process.env.CANVA_DEBUG;

    if ("CANVA_DEBUG_LEVEL" in env)
      process.env.CANVA_DEBUG_LEVEL = env.CANVA_DEBUG_LEVEL;
    else delete process.env.CANVA_DEBUG_LEVEL;

    fn();
  } finally {
    if (previousDebug === undefined) delete process.env.CANVA_DEBUG;
    else process.env.CANVA_DEBUG = previousDebug;

    if (previousLevel === undefined) delete process.env.CANVA_DEBUG_LEVEL;
    else process.env.CANVA_DEBUG_LEVEL = previousLevel;
  }
}

test("CANVA_DEBUG=1 does not enable Chromium capture verbose logging", () => {
  withDebugEnv({ CANVA_DEBUG: "1" }, () => {
    assert.equal(shouldEnableCaptureVerboseLogging(), false);
  });
});

test("CANVA_DEBUG=2 enables Chromium capture verbose logging", () => {
  withDebugEnv({ CANVA_DEBUG: "2" }, () => {
    assert.equal(shouldEnableCaptureVerboseLogging(), true);
  });
});

test("module-specific debug values do not enable verbose logging", () => {
  withDebugEnv({ CANVA_DEBUG: "gpu" }, () => {
    assert.equal(shouldEnableCaptureVerboseLogging(), false);
  });
});


test("clears ephemeral session storage, cache and cookie store", async () => {
  const calls = [];
  await clearEphemeralSessionData({
    clearStorageData: async () => calls.push("clearStorageData"),
    clearCache: async () => calls.push("clearCache"),
    cookies: {
      flushStore: async () => calls.push("cookies.flushStore"),
    },
  });

  assert.deepEqual(calls, [
    "clearStorageData",
    "clearCache",
    "cookies.flushStore",
  ]);
});

test("reports ephemeral cleanup failures without throwing", async () => {
  const warnings = [];
  await clearEphemeralSessionData(
    {
      clearStorageData: async () => {
        throw new Error("storage failed");
      },
      clearCache: async () => {
        throw new Error("cache failed");
      },
      cookies: {
        flushStore: async () => {
          throw new Error("cookie failed");
        },
      },
    },
    (operation, error) => {
      warnings.push(`${operation}:${error.message}`);
    },
  );

  assert.deepEqual(warnings, [
    "clearStorageData:storage failed",
    "clearCache:cache failed",
    "cookies.flushStore:cookie failed",
  ]);
});

test("sharedWebPreferences keeps secure defaults", () => {
  const session = /** @type {any} */ {
    partition: "persist:canva",
  };
  const preferences = sharedWebPreferences(() => session);

  assert.equal(preferences.session, session);
  assert.equal(preferences.contextIsolation, true);
  assert.equal(preferences.sandbox, true);
  assert.equal(preferences.nodeIntegration, false);
  assert.equal(preferences.spellcheck, true);
});

test("main runtime opens Canva, not the project website, as the app home URL", () => {
  const mainSource = fs.readFileSync(
    path.join(repoRoot, "electron/main/index.ts"),
    "utf8",
  );

  assert.match(
    mainSource,
    /const APP_URL = [\"']https:\/\/www\.canva\.com\/[\"'];/,
  );
  assert.doesNotMatch(
    mainSource,
    /const APP_URL = [\"']https:\/\/coletivo420\.github\.io\/canva-linux\/[\"'];/,
  );
});

test("sanitizes download filenames before choosing save paths", async () => {
  let downloadListener = null;
  let savePath = null;
  const fakeSession = {
    cookies: { flushStore: async () => {} },
    flushStorageData: async () => {},
    setPermissionRequestHandler() {},
    setPermissionCheckHandler() {},
    webRequest: { onBeforeSendHeaders() {} },
    on(event, listener) {
      if (event === "will-download") downloadListener = listener;
    },
  };

  await configureSession({
    app: {
      getPath(name) {
        assert.equal(name, "downloads");
        return "/home/user/Downloads";
      },
    },
    debugLog() {
      return true;
    },
    flushSessionFn: async () => {},
    getCanvaSession() {
      return fakeSession;
    },
    path,
    partition: "persist:canva",
    shouldGrantRemotePermission() {
      return false;
    },
  });

  assert.equal(typeof downloadListener, "function");
  downloadListener(null, {
    getFilename() {
      return "../../bad:name?.png";
    },
    setSavePath(nextPath) {
      savePath = nextPath;
    },
  });

  assert.equal(savePath, path.join("/home/user/Downloads", "bad_name_.png"));
});

test("download filename sanitizer falls back for empty or directory-only names", () => {
  assert.equal(sanitizeDownloadFilename("../../../", path), "download");
  assert.equal(
    sanitizeDownloadFilename("safe-name.png", path),
    "safe-name.png",
  );
  assert.equal(
    sanitizeDownloadFilename("bad<name>|*.png", path),
    "bad_name___.png",
  );
});

const {
  configureLinuxNativeCredentialStore,
  selectLinuxPasswordStore,
} = loadRuntimeModule("main/linux-credential-runtime");

test("selects KWallet 6 for non-Flatpak KDE and Plasma desktops", () => {
  assert.equal(
    selectLinuxPasswordStore(
      { XDG_CURRENT_DESKTOP: "KDE" },
      { fileExists: () => false },
    ).selectedStore,
    "kwallet6",
  );
  assert.equal(
    selectLinuxPasswordStore(
      { XDG_SESSION_DESKTOP: "plasma" },
      { fileExists: () => false },
    ).selectedStore,
    "kwallet6",
  );
});

test("selects gnome-libsecret for non-Flatpak GNOME and unknown desktops", () => {
  assert.equal(
    selectLinuxPasswordStore(
      { XDG_CURRENT_DESKTOP: "GNOME" },
      { fileExists: () => false },
    ).selectedStore,
    "gnome-libsecret",
  );
  assert.equal(
    selectLinuxPasswordStore({}, { fileExists: () => false }).selectedStore,
    "gnome-libsecret",
  );
});

test("Flatpak defaults to Freedesktop Secret Service/libsecret path", () => {
  const plan = selectLinuxPasswordStore(
    { FLATPAK_ID: "io.github.coletivo420.canva-linux" },
    { fileExists: () => false },
  );

  assert.equal(plan.isFlatpak, true);
  assert.equal(plan.selectedStore, "gnome-libsecret");
  assert.deepEqual(plan.candidates[0], {
    store: "gnome-libsecret",
    reason: "freedesktop-secret-service",
  });
});

test("Flatpak on KDE exposes kwallet6 and kwallet5 fallback candidates", () => {
  const plan = selectLinuxPasswordStore(
    {
      FLATPAK_ID: "io.github.coletivo420.canva-linux",
      XDG_CURRENT_DESKTOP: "KDE",
    },
    { fileExists: () => false },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
  assert.deepEqual(plan.candidates, [
    { store: "gnome-libsecret", reason: "freedesktop-secret-service" },
    { store: "kwallet6", reason: "kde-kwallet6-fallback" },
    { store: "kwallet5", reason: "kde-kwallet5-fallback" },
  ]);
});

test("KDE_SESSION_VERSION=5 selects kwallet5 compatibility in Flatpak", () => {
  const plan = selectLinuxPasswordStore(
    {
      FLATPAK_ID: "io.github.coletivo420.canva-linux",
      XDG_CURRENT_DESKTOP: "KDE",
      KDE_SESSION_VERSION: "5",
    },
    { fileExists: () => false },
  );

  assert.equal(plan.selectedStore, "kwallet5");
  assert.deepEqual(
    plan.candidates.map((candidate) => candidate.store),
    ["gnome-libsecret", "kwallet6", "kwallet5"],
  );
});

test("CANVA_LINUX_PASSWORD_STORE=kwallet5 is accepted", () => {
  const plan = selectLinuxPasswordStore(
    { CANVA_LINUX_PASSWORD_STORE: "kwallet5" },
    { fileExists: () => false },
  );

  assert.equal(plan.selectedStore, "kwallet5");
});

test("CANVA_LINUX_PASSWORD_STORE=basic_text is rejected", () => {
  const warnings = [];
  const plan = selectLinuxPasswordStore(
    { CANVA_LINUX_PASSWORD_STORE: "basic_text" },
    {
      fileExists: () => false,
      logger: {
        info() {},
        warn(message) {
          warnings.push(message);
        },
      },
    },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Ignoring unsafe or unsupported/);
});

test("invalid password store override falls back to auto", () => {
  const warnings = [];
  const plan = selectLinuxPasswordStore(
    { XDG_CURRENT_DESKTOP: "KDE", CANVA_LINUX_PASSWORD_STORE: "basic" },
    {
      fileExists: () => false,
      logger: {
        info() {},
        warn(message) {
          warnings.push(message);
        },
      },
    },
  );

  assert.equal(plan.selectedStore, "kwallet6");
  assert.equal(warnings.length, 1);
});

test("configures Chromium password-store before credential backend checks", () => {
  const switches = [];
  const plan = configureLinuxNativeCredentialStore({
    platform: "linux",
    env: { XDG_CURRENT_DESKTOP: "KDE" },
    logger: { info() {}, warn() {} },
    app: {
      commandLine: {
        appendSwitch(name, value) {
          switches.push([name, value]);
        },
      },
    },
  });

  assert.equal(plan.selectedStore, "kwallet6");
  assert.deepEqual(switches, [["password-store", "kwallet6"]]);
});
