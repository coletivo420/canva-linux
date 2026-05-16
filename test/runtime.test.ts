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
  applyRuntimeGpuCli,
  configureSession,
  sanitizeDownloadFilename,
  sharedWebPreferences,
  shouldEnableCaptureVerboseLogging,
} = loadRuntimeModule("main/runtime");

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

test("debugLevel=1 does not enable Chromium capture verbose logging", () => {
  assert.equal(shouldEnableCaptureVerboseLogging(1), false);
});

test("debugLevel=2 enables Chromium capture verbose logging", () => {
  assert.equal(shouldEnableCaptureVerboseLogging(2), true);
});

test("debugLevel=0 keeps Chromium capture verbose logging disabled", () => {
  assert.equal(shouldEnableCaptureVerboseLogging(0), false);
});

function createFakeApp() {
  const switches = [];
  const switchValues = new Map();
  let hardwareDisabled = false;
  return {
    app: {
      commandLine: {
        appendSwitch(name, value) {
          switches.push([name, value]);
          switchValues.set(name, value || "");
        },
        getSwitchValue(name) {
          return switchValues.get(name) || "";
        },
      },
      disableHardwareAcceleration() {
        hardwareDisabled = true;
      },
    },
    switches,
    get hardwareDisabled() {
      return hardwareDisabled;
    },
  };
}

const defaultRuntimeCli = {
  help: false,
  version: false,
  debugLevel: 0,
  credentialStore: "auto",
  gpuBackend: "auto",
  forceX11: false,
  forceWayland: false,
  disableWaylandColorManager: false,
  passthroughArgs: [],
};

test("runtime applies --gpu-backend=software outside Flatpak", () => {
  const fake = createFakeApp();
  applyRuntimeGpuCli({
    app: fake.app,
    runtimeCli: { ...defaultRuntimeCli, gpuBackend: "software" },
    detectedDisplayServer: "x11",
  });

  assert.equal(fake.hardwareDisabled, true);
  assert.deepEqual(fake.switches, [
    ["disable-gpu", undefined],
    ["disable-gpu-compositing", undefined],
  ]);
});

test("runtime applies --gpu-backend=vulkan outside Flatpak", () => {
  const fake = createFakeApp();
  applyRuntimeGpuCli({
    app: fake.app,
    runtimeCli: { ...defaultRuntimeCli, gpuBackend: "vulkan" },
    detectedDisplayServer: "x11",
  });

  assert.deepEqual(fake.switches, [
    ["enable-gpu-rasterization", undefined],
    ["enable-zero-copy", undefined],
    ["enable-features", "Vulkan,VulkanFromANGLE,DefaultANGLEVulkan"],
    ["use-angle", "vulkan"],
  ]);
});

test("runtime applies --force-x11 and --force-wayland outside Flatpak", () => {
  const x11 = createFakeApp();
  applyRuntimeGpuCli({
    app: x11.app,
    runtimeCli: { ...defaultRuntimeCli, forceX11: true },
    detectedDisplayServer: "wayland",
  });
  assert.deepEqual(x11.switches.at(-1), ["ozone-platform", "x11"]);

  const wayland = createFakeApp();
  applyRuntimeGpuCli({
    app: wayland.app,
    runtimeCli: { ...defaultRuntimeCli, forceWayland: true },
    detectedDisplayServer: "x11",
  });
  assert.deepEqual(wayland.switches.at(-1), ["ozone-platform", "wayland"]);
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

function credentialProbeRunner(statusByService) {
  return (command, args) => {
    if (command === "gdbus" && args[0] === "help") {
      return { status: 0, stdout: "Usage: gdbus" };
    }

    if (command !== "gdbus") {
      return { status: 1, stdout: "" };
    }

    const method = args[args.indexOf("--method") + 1];
    if (method === "org.freedesktop.DBus.NameHasOwner") {
      const serviceName = args.at(-1);
      return {
        status: 0,
        stdout: statusByService[serviceName] === "available" ? "(true,)" : "(false,)",
      };
    }

    if (method === "org.freedesktop.DBus.ListActivatableNames") {
      const activatableServices = Object.entries(statusByService)
        .filter(([, status]) => status === "activatable")
        .map(([service]) => service)
        .join(" ");
      return { status: 0, stdout: activatableServices };
    }

    return { status: 1, stdout: "" };
  };
}

function selectWithProbe(env, statusByService, options = {}) {
  return selectLinuxPasswordStore(
    { DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus", ...env },
    {
      fileExists: () => false,
      probeRunner: credentialProbeRunner(statusByService),
      ...options,
    },
  );
}

const SERVICES = {
  secrets: "org.freedesktop.secrets",
  kwallet6: "org.kde.kwalletd6",
  kwallet5: "org.kde.kwalletd5",
};


test("gdbus availability uses help and gdbus-only probes work", () => {
  const calls = [];
  const plan = selectLinuxPasswordStore(
    {
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
      XDG_CURRENT_DESKTOP: "GNOME",
    },
    {
      fileExists: () => false,
      probeRunner(command, args) {
        calls.push([command, args]);
        if (command === "gdbus" && args[0] === "help") {
          return { status: 0, stdout: "Usage: gdbus" };
        }
        if (command === "busctl") return { status: 127, stdout: "" };
        const method = args[args.indexOf("--method") + 1];
        if (method === "org.freedesktop.DBus.NameHasOwner") {
          return { status: 0, stdout: args.at(-1) === SERVICES.secrets ? "(true,)" : "(false,)" };
        }
        if (method === "org.freedesktop.DBus.ListActivatableNames") {
          return { status: 0, stdout: "org.kde.kwalletd6 org.kde.kwalletd5" };
        }
        return { status: 1, stdout: "" };
      },
    },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
  assert.deepEqual(calls[0], ["gdbus", ["help"]]);
  assert.equal(calls.some(([command]) => command === "busctl"), false);
});

test("KDE Plasma 6 selects kwallet6 when KWallet 6 is available", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" },
    { [SERVICES.kwallet6]: "available" },
  );

  assert.equal(plan.selectedStore, "kwallet6");
  assert.equal(plan.selectedService, SERVICES.kwallet6);
  assert.deepEqual(
    plan.candidates.map((candidate) => candidate.store),
    ["kwallet6", "kwallet5", "gnome-libsecret"],
  );
});

test("KDE Plasma 6 falls back from unavailable kwallet6 to available kwallet5", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" },
    {
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.kwallet5]: "available",
      [SERVICES.secrets]: "available",
    },
  );

  assert.equal(plan.selectedStore, "kwallet5");
});

test("KDE Plasma 6 falls back to Secret Service when both KWallet services are unavailable", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" },
    {
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.kwallet5]: "unavailable",
      [SERVICES.secrets]: "available",
    },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
});

test("KDE Plasma 6 keeps desktop preference when every service probes unavailable", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" },
    {
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.kwallet5]: "unavailable",
      [SERVICES.secrets]: "unavailable",
    },
  );

  assert.equal(plan.selectedStore, "kwallet6");
});

test("KDE Plasma 5 selects kwallet5 when KWallet 5 is available", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "5" },
    { [SERVICES.kwallet5]: "available" },
  );

  assert.equal(plan.selectedStore, "kwallet5");
  assert.deepEqual(
    plan.candidates.map((candidate) => candidate.store),
    ["kwallet5", "kwallet6", "gnome-libsecret"],
  );
});

test("KDE Plasma 5 falls back from unavailable kwallet5 to available kwallet6", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "5" },
    {
      [SERVICES.kwallet5]: "unavailable",
      [SERVICES.kwallet6]: "available",
      [SERVICES.secrets]: "available",
    },
  );

  assert.equal(plan.selectedStore, "kwallet6");
});

test("KDE Plasma 5 falls back to Secret Service when both KWallet services are unavailable", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "5" },
    {
      [SERVICES.kwallet5]: "unavailable",
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.secrets]: "available",
    },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
});

test("GNOME selects Secret Service when available", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "GNOME" },
    { [SERVICES.secrets]: "available", [SERVICES.kwallet6]: "available" },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
  assert.deepEqual(
    plan.candidates.map((candidate) => candidate.store),
    ["gnome-libsecret", "kwallet6", "kwallet5"],
  );
});

test("GNOME falls back to kwallet6 when Secret Service is unavailable", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "GNOME" },
    {
      [SERVICES.secrets]: "unavailable",
      [SERVICES.kwallet6]: "available",
      [SERVICES.kwallet5]: "available",
    },
  );

  assert.equal(plan.selectedStore, "kwallet6");
});

test("GNOME falls back to kwallet5 when Secret Service and kwallet6 are unavailable", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "GNOME" },
    {
      [SERVICES.secrets]: "unavailable",
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.kwallet5]: "available",
    },
  );

  assert.equal(plan.selectedStore, "kwallet5");
});

test("unknown desktop selects Secret Service first and can fall back to KWallet", () => {
  assert.equal(
    selectWithProbe({}, { [SERVICES.secrets]: "available" }).selectedStore,
    "gnome-libsecret",
  );
  assert.equal(
    selectWithProbe(
      {},
      { [SERVICES.secrets]: "unavailable", [SERVICES.kwallet6]: "available" },
    ).selectedStore,
    "kwallet6",
  );
  assert.equal(
    selectWithProbe(
      {},
      {
        [SERVICES.secrets]: "unavailable",
        [SERVICES.kwallet6]: "unavailable",
        [SERVICES.kwallet5]: "available",
      },
    ).selectedStore,
    "kwallet5",
  );
});

test("activatable services are selected before unavailable desktop preferences", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "6" },
    {
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.kwallet5]: "activatable",
      [SERVICES.secrets]: "available",
    },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
});

test("unavailable probes keep the first desktop-preferred candidate", () => {
  const plan = selectWithProbe(
    { XDG_CURRENT_DESKTOP: "GNOME" },
    {
      [SERVICES.secrets]: "unavailable",
      [SERVICES.kwallet6]: "unavailable",
      [SERVICES.kwallet5]: "unavailable",
    },
  );

  assert.equal(plan.selectedStore, "gnome-libsecret");
});

test("missing D-Bus probe support keeps desktop-preferred candidate order", () => {
  const plan = selectLinuxPasswordStore(
    { XDG_CURRENT_DESKTOP: "KDE", KDE_SESSION_VERSION: "5" },
    { fileExists: () => false },
  );

  assert.equal(plan.selectedStore, "kwallet5");
  assert.equal(plan.candidates[0].probeStatus, "unknown");
});

test("CLI credential-store overrides are accepted", () => {
  for (const override of ["kwallet5", "kwallet6", "gnome-libsecret"]) {
    const plan = selectWithProbe(
      { XDG_CURRENT_DESKTOP: "GNOME" },
      { [SERVICES.secrets]: "available" },
      { credentialStore: override },
    );

    assert.equal(plan.selectedStore, override);
  }
});

test("unsafe CLI credential-store overrides are rejected and automatic fallback is used", () => {
  for (const override of ["basic_text", "basic", "unknown"]) {
    const warnings = [];
    const plan = selectLinuxPasswordStore(
      {
        DBUS_SESSION_BUS_ADDRESS: "unix:path=/run/user/1000/bus",
        XDG_CURRENT_DESKTOP: "KDE",
      },
      {
        fileExists: () => false,
        probeRunner: credentialProbeRunner({ [SERVICES.kwallet6]: "available" }),
        credentialStore: override,
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
    assert.match(warnings[0], /Ignoring unsafe or unsupported/);
  }
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
