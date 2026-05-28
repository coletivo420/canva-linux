// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  PUBLIC_AUTH_TITLE_PATTERN,
  createOAuthHelpers,
  publicLandingSignalsProbeScript,
} = loadRuntimeModule("main/oauth");

function createFakeWindow(initialUrl = "https://www.canva.com/login") {
  const windowListeners = new Map();
  const webContentsListeners = new Map();
  let destroyed = false;
  let currentUrl = initialUrl;
  let loading = false;
  const session = {
    partition: "persist:canva",
    cookies: {
      flushStore: async () => {},
    },
    flushStorageData: async () => {},
  };
  const window = {
    webContents: {
      id: 900,
      session,
      getURL: () => currentUrl,
      isLoading: () => loading,
      setLoading(value) {
        loading = value;
      },
      setURL(url) {
        currentUrl = url;
      },
      getLastWebPreferences: () => ({
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      }),
      on(event, listener) {
        webContentsListeners.set(event, listener);
      },
      once(event, listener) {
        webContentsListeners.set(`once:${event}`, listener);
      },
      setWindowOpenHandler(listener) {
        webContentsListeners.set("window-open-handler", listener);
      },
      loadURL(url) {
        currentUrl = url;
      },
      executeJavaScript: async () => ({
        localStorageKeys: 2,
        sessionStorageKeys: 1,
        indexedDbDatabases: 3,
        cacheStorageKeys: 4,
      }),
    },
    isDestroyed: () => destroyed,
    destroy() {
      destroyed = true;
    },
    focus() {},
    show() {},
    loadURL(url) {
      currentUrl = url;
    },
    setTitle() {},
    setMenuBarVisibility() {},
    setBackgroundColor() {},
    getBounds: () => ({ x: 0, y: 0, width: 520, height: 760 }),
    once(event, listener) {
      windowListeners.set(`once:${event}`, listener);
    },
    on(event, listener) {
      windowListeners.set(event, listener);
    },
  };

  return { session, webContentsListeners, window, windowListeners };
}

function createTab(id, webContentsId, order, options = {}) {
  let currentUrl = options.url || "https://www.canva.com/pt_br/";
  let title = options.title || "Canva";
  const listeners = new Map();
  const webContents = {
    id: webContentsId,
    getURL: () => currentUrl,
    getTitle: () => title,
    setTitle(nextTitle) {
      title = nextTitle;
    },
    reload() {
      order.push(`reload:${id}`);
      listeners.get("once:did-finish-load")?.();
      listeners.delete("once:did-finish-load");
    },
    reloadIgnoringCache: options.reloadIgnoringCache
      ? () => {
          order.push(`reloadIgnoringCache:${id}`);
          listeners.get("once:did-finish-load")?.();
          listeners.delete("once:did-finish-load");
        }
      : undefined,
    loadURL: options.loadURL
      ? (url) => {
          currentUrl = url;
          order.push(`loadURL:${id}:${url}`);
          listeners.get("once:did-finish-load")?.();
          listeners.delete("once:did-finish-load");
        }
      : undefined,
    executeJavaScript:
      options.executeJavaScript ||
      (async (code) => {
        if (String(code).includes("loginLinks")) {
          return options.publicSignals || { loginLinks: 0, signupLinks: 0, authButtons: 0 };
        }
        return {
          localStorageKeys: 2,
          sessionStorageKeys: 1,
          indexedDbDatabases: 3,
          cacheStorageKeys: 4,
        };
      }),
    once(event, listener) {
      listeners.set(`once:${event}`, listener);
    },
  };
  return {
    id,
    view: {
      webContents,
    },
  };
}

function createHarness({
  activeTab,
  authorizedCallbackFallbackDelayMs = 0,
  authorizedCallbackFallbackMaxAttempts = 2,
  cookieGet,
  sourceTab,
  sourceWebContentsId = 300,
} = {}) {
  const authPopups = new Map();
  const debugEvents = [];
  const order = [];
  const fake = createFakeWindow();
  if (cookieGet) fake.session.cookies.get = cookieGet;
  const helpers = createOAuthHelpers({
    appIconPath: "/tmp/icon.png",
    appName: "Canva Linux",
    authPopups,
    BrowserWindow: function FakeBrowserWindow() {
      return fake.window;
    },
    classifyNavigationRequest() {
      return { kind: "blocked-external" };
    },
    debugLog(...args) {
      debugEvents.push(args);
      return true;
    },
    detectCanvaOAuthCallback(url) {
      if (String(url).includes("/oauth/authorized")) return "authorized";
      if (String(url).includes("/oauth/")) return "oauth";
      return null;
    },
    extractHostname() {
      return "accounts.google.com";
    },
    async flushSession() {
      order.push("flush");
    },
    getActiveTab() {
      return activeTab;
    },
    getCanvaSession() {
      return fake.session;
    },
    getSourceTabByWebContentsId(id) {
      return id === sourceWebContentsId ? sourceTab : undefined;
    },
    isBlankPopupUrl(url) {
      return !url || url === "about:blank" || url === "about:srcdoc";
    },
    isCanvaAuthUrl(url) {
      return String(url).includes("canva.com/login");
    },
    isCanvaUrl(url) {
      return String(url).includes("canva.com");
    },
    isOAuthProviderUrl(url) {
      return String(url).includes("accounts.google.com");
    },
    isSafeExternalUrl(url) {
      return String(url).startsWith("https://");
    },
    mainWindowRef() {
      return null;
    },
    nextPopupIdRef() {
      return 1;
    },
    shell: { openExternal() {} },
    sharedWebPreferences() {
      return {};
    },
    summarizeOauthEntry(entry) {
      return entry ? `popup=${entry.id}` : "none";
    },
    windowLabel() {
      return "oauth-popup";
    },
    postOAuthSessionFlushDelayMs: 0,
    authorizedCallbackFallbackDelayMs,
    authorizedCallbackFallbackMaxAttempts,
  });

  const entry = helpers.registerAuthPopupWindow(
    fake.window,
    "https://www.canva.com/login",
    {
      openerUrl: "https://www.canva.com/login",
      sourceWebContentsId,
    },
  );
  const originalDestroy = fake.window.destroy;
  fake.window.destroy = () => {
    order.push("destroy");
    originalDestroy();
  };

  return { ...fake, authPopups, debugEvents, entry, helpers, order };
}

async function waitForDebugEvent(debugEvents, eventName) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    if (debugEvents.some((event) => event[1] === eventName)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Timed out waiting for debug event ${eventName}`);
}

test("authorized callback detection records callback type and schedules fallback", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google?code=secret&state=secret";

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);

  assert.equal(harness.entry.sawAuthorizedCallback, true);
  assert.equal(harness.entry.pendingCallbackType, "authorized");
  assert.equal(harness.entry.authorizedCallbackFallbackQueued, true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-scheduled" &&
        event.includes("delayMs=0"),
    ),
    true,
  );
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");
});

test("did-finish-load flushes session before closing popup and reloading", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google?code=secret&state=secret";

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.deepEqual(order, ["flush", "destroy", "reloadIgnoringCache:1"]);
});

test("did-finish-load finalizes normalized authorized callback URL without exact string match", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const pendingCallbackUrl =
    "https://www.canva.com/oauth/authorized/google?state=secret-state&code=secret-code";
  const loadedUrl =
    "https://www.canva.com/oauth/authorized/google?code=secret-code&state=secret-state";

  harness.webContentsListeners.get("did-redirect-navigation")(null, pendingCallbackUrl);
  harness.window.webContents.setURL(loadedUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("flush"), true);
  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-ready" &&
        event.includes("loadedType=authorized") &&
        event.includes("pendingType=authorized") &&
        event.includes("urlMatch=false"),
    ),
    true,
  );
});

test("did-finish-load finalizes loaded authorized URL even when pending URL differs", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const pendingCallbackUrl = "https://www.canva.com/oauth/google/start";
  const loadedUrl = "https://www.canva.com/oauth/authorized/google?code=secret";

  harness.webContentsListeners.get("did-navigate")(null, pendingCallbackUrl);
  harness.window.webContents.setURL(loadedUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("flush"), true);
  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-ready" &&
        event.includes("loadedType=authorized") &&
        event.includes("pendingType=oauth") &&
        event.includes("urlMatch=false"),
    ),
    true,
  );
});

test("authorized callback fallback finalizes when did-finish-load does not fire", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google?code=secret&state=secret";

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  await waitForDebugEvent(harness.debugEvents, "oauth-authorized-callback-fallback-fired");
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("flush"), true);
  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-finalize-authorized-callback-start" &&
        event.includes("trigger=fallback"),
    ),
    true,
  );
});

test("authorized callback fallback defers while popup is still loading", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({
    authorizedCallbackFallbackDelayMs: 50,
    sourceTab,
  });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.window.webContents.setLoading(true);
  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  await waitForDebugEvent(
    harness.debugEvents,
    "oauth-authorized-callback-fallback-deferred",
  );

  assert.equal(order.includes("flush"), false);
  assert.equal(order.includes("reloadIgnoringCache:1"), false);
  assert.equal(harness.window.isDestroyed(), false);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-deferred" &&
        event.includes("reason=still-loading") &&
        event.includes("attempt=1"),
    ),
    true,
  );

  harness.window.webContents.setLoading(false);
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");
});

test("authorized callback fallback fires after popup loading finishes", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({
    authorizedCallbackFallbackDelayMs: 50,
    sourceTab,
  });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.window.webContents.setLoading(true);
  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  await waitForDebugEvent(
    harness.debugEvents,
    "oauth-authorized-callback-fallback-deferred",
  );
  harness.window.webContents.setLoading(false);
  await waitForDebugEvent(harness.debugEvents, "oauth-authorized-callback-fallback-fired");
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("flush"), true);
  assert.equal(order.includes("destroy"), true);
  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-fired" &&
        event.includes("loading=false") &&
        event.includes("attempt=2"),
    ),
    true,
  );
});

test("did-finish-load finalization wins over delayed fallback while loading", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({
    authorizedCallbackFallbackDelayMs: 50,
    sourceTab,
  });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.window.webContents.setLoading(true);
  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");
  await waitForDebugEvent(harness.debugEvents, "oauth-authorized-callback-fallback-skipped");

  assert.equal(order.filter((entry) => entry === "reloadIgnoringCache:1").length, 1);
  assert.equal(order.filter((entry) => entry === "destroy").length, 1);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-finalize-authorized-callback-start" &&
        event.includes("trigger=did-finish-load"),
    ),
    true,
  );
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-skipped" &&
        event.includes("reason=already-handled") &&
        event.includes("attempt=1"),
    ),
    true,
  );
});

test("authorized callback fallback fires at max attempts if loading stays true", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.window.webContents.setLoading(true);
  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  await waitForDebugEvent(
    harness.debugEvents,
    "oauth-authorized-callback-fallback-deferred",
  );
  await waitForDebugEvent(harness.debugEvents, "oauth-authorized-callback-fallback-fired");
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("flush"), true);
  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-fired" &&
        event.includes("loading=true") &&
        event.includes("attempt=2") &&
        event.includes("reason=max-attempts"),
    ),
    true,
  );
});

test("authorized callback fallback skips after did-finish-load finalization", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-authorized-callback-fallback-skipped");
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.filter((entry) => entry === "reloadIgnoringCache:1").length, 1);
  assert.equal(order.filter((entry) => entry === "destroy").length, 1);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-skipped" &&
        event.includes("reason=already-handled"),
    ),
    true,
  );
});

test("configured OAuth delays use zero milliseconds in test harness", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order);
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-scheduled" &&
        event.includes("delayMs=0"),
    ),
    true,
  );
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-post-flush-settle" && event.includes("delayMs=0"),
    ),
    true,
  );
});

test("post-login reload targets source tab resolved by sourceWebContentsId", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const activeTab = createTab(2, 400, order, { reloadIgnoringCache: true });
  const harness = createHarness({ activeTab, sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(order.includes("reloadIgnoringCache:2"), false);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-source-tab-resolved" &&
        event.includes("tab=1") &&
        event.includes("fallback=false"),
    ),
    true,
  );
});

test("active tab fallback is used only when source tab cannot be resolved", async () => {
  const order = [];
  const activeTab = createTab(2, 400, order);
  const harness = createHarness({ activeTab, sourceTab: undefined });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("reload:2"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-source-tab-resolved" &&
        event.includes("tab=2") &&
        event.includes("fallback=true"),
    ),
    true,
  );
});

test("duplicate authorized callback detection does not double reload", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.filter((entry) => entry === "reloadIgnoringCache:1").length, 1);
  assert.equal(order.filter((entry) => entry === "destroy").length, 1);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-authorized-callback-fallback-skipped" &&
        event.includes("reason=already-queued"),
    ),
    true,
  );
});

test("cookie diagnostics log safe summary without cookie values", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order);
  const cookieValue = "super-secret-cookie-value";
  const harness = createHarness({
    sourceTab,
    cookieGet: async (filter) => {
      order.push(`cookie-get:${filter.url}`);
      return [
        { name: "sid", value: cookieValue, secure: true, httpOnly: true, session: false },
        { name: "session", value: "another-secret", secure: true, httpOnly: false, session: true },
      ];
    },
  });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google?code=secret-code&state=secret-state";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("cookie-get:https://www.canva.com"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-cookie-summary" &&
        event.includes("count=2") &&
        event.includes("persistent=1") &&
        event.includes("session=1") &&
        event.includes("secure=2") &&
        event.includes("httpOnly=1"),
    ),
    true,
  );
  const flattenedLogs = JSON.stringify(harness.debugEvents);
  assert.equal(flattenedLogs.includes(cookieValue), false);
  assert.equal(flattenedLogs.includes("another-secret"), false);
  assert.equal(flattenedLogs.includes("secret-code"), false);
  assert.equal(flattenedLogs.includes("secret-state"), false);
});

test("reloadIgnoringCache is preferred when available", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(order.includes("reload:1"), false);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "reload-source-tab-after-oauth" &&
        event.includes("mode=reloadIgnoringCache"),
    ),
    true,
  );
});

test("closing popup after authorized callback finalizes instead of logging before-callback close", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";
  let prevented = false;

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  harness.windowListeners.get("close")({ preventDefault: () => { prevented = true; } });
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(prevented, true);
  assert.equal(order.includes("flush"), true);
  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-finalize-authorized-callback-start" &&
        event.includes("trigger=popup-close-after-authorized-callback"),
    ),
    true,
  );
  assert.equal(
    harness.debugEvents.some((event) => event[1] === "popup-close-before-callback"),
    false,
  );
});

test("OAuth storage diagnostics log only safe counts", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order);
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-finalize-authorized-callback-done");

  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-storage-summary" &&
        event.includes("context=authorized-callback-post-flush") &&
        event.includes("localStorageKeys=2") &&
        event.includes("sessionStorageKeys=1") &&
        event.includes("indexedDbDatabases=3") &&
        event.includes("cacheStorageKeys=4"),
    ),
    true,
  );
});

test("default post-OAuth reload preserves current URL even when loadURL exists", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, {
    loadURL: true,
    reloadIgnoringCache: true,
    url: "https://www.canva.com/design/DAF123/edit",
  });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "post-oauth-source-load-classification");

  assert.equal(order.includes("reloadIgnoringCache:1"), true);
  assert.equal(order.includes("loadURL:1:https://www.canva.com/"), false);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "reload-source-tab-after-oauth" &&
        event.includes("mode=reloadIgnoringCache") &&
        event.includes("target=current") &&
        event.includes("url=https://www.canva.com/design/DAF123/edit"),
    ),
    true,
  );
});

test("design editor and folder URLs are not canonical-home fallback targets", async () => {
  for (const url of [
    "https://www.canva.com/design/DAF123/edit",
    "https://www.canva.com/folder/all-designs",
  ]) {
    const order = [];
    const sourceTab = createTab(1, 300, order, { loadURL: true, url });
    const harness = createHarness({ sourceTab });
    harness.order.push = order.push.bind(order);
    const callbackUrl = "https://www.canva.com/oauth/authorized/google";

    harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
    harness.window.webContents.setURL(callbackUrl);
    harness.webContentsListeners.get("did-finish-load")();
    await waitForDebugEvent(harness.debugEvents, "post-oauth-source-load-classification");

    assert.equal(order.includes("loadURL:1:https://www.canva.com/"), false);
    assert.equal(
      harness.debugEvents.some(
        (event) =>
          event[1] === "post-oauth-source-load-classification" &&
          event.includes("localizedPublicLanding=false"),
      ),
      true,
    );
  }
});

test("canonical fallback occurs only after localized public landing detection", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, {
    loadURL: true,
    url: "https://www.canva.com/pt_br/",
    title: "Entrar no Canva",
    publicSignals: { loginLinks: 1, signupLinks: 1, authButtons: 0 },
  });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "post-oauth-canonical-home-fallback");

  assert.deepEqual(order, ["flush", "destroy", "reload:1", "loadURL:1:https://www.canva.com/"]);
  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "reload-source-tab-after-oauth" &&
        event.includes("target=current") &&
        !event.includes("target=https://www.canva.com/"),
    ),
    true,
  );
});

test("localized landing paths require public auth signals", async () => {
  for (const path of ["/pt_br/", "/es/", "/fr/", "/de/", "/en_gb/"]) {
    const order = [];
    const sourceTab = createTab(1, 300, order, {
      loadURL: true,
      url: `https://www.canva.com${path}`,
      publicSignals: { loginLinks: 1, signupLinks: 0, authButtons: 0 },
    });
    const harness = createHarness({ sourceTab });
    harness.order.push = order.push.bind(order);
    const callbackUrl = "https://www.canva.com/oauth/authorized/google";

    harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
    harness.window.webContents.setURL(callbackUrl);
    harness.webContentsListeners.get("did-finish-load")();
    await waitForDebugEvent(harness.debugEvents, "post-oauth-source-load-classification");

    assert.equal(
      harness.debugEvents.some(
        (event) =>
          event[1] === "post-oauth-source-load-classification" &&
          event.includes("localizedPublicLanding=true"),
      ),
      true,
    );
  }
});

test("canonical home is not classified as localized public landing", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, {
    loadURL: true,
    url: "https://www.canva.com/",
    title: "Log in to Canva",
    publicSignals: { loginLinks: 1, signupLinks: 1, authButtons: 1 },
  });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "post-oauth-source-load-classification");

  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "post-oauth-source-load-classification" &&
        event.includes("localizedPublicLanding=false"),
    ),
    true,
  );
});

test("oauth-public-landing-signals logs only safe counts", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, {
    publicSignals: { loginLinks: 1, signupLinks: 1, authButtons: 0 },
  });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google?code=secret-code&state=secret-state";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-public-landing-signals");

  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-public-landing-signals" &&
        event.includes("loginLinks=1") &&
        event.includes("signupLinks=1") &&
        event.includes("authButtons=0"),
    ),
    true,
  );
  const flattenedLogs = JSON.stringify(harness.debugEvents);
  assert.equal(flattenedLogs.includes("secret-code"), false);
  assert.equal(flattenedLogs.includes("secret-state"), false);
  assert.equal(flattenedLogs.includes("href"), false);
  assert.equal(flattenedLogs.includes("data-testid"), false);
});

test("post-OAuth storage diagnostics continue to log safe counts", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, {
    executeJavaScript: async (code) => {
      if (String(code).includes("loginLinks")) {
        return { loginLinks: 0, signupLinks: 0, authButtons: 0 };
      }
      return {
        localStorageKeys: 5,
        sessionStorageKeys: 6,
        indexedDbDatabases: 7,
        cacheStorageKeys: 8,
      };
    },
  });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "post-oauth-source-load-classification");

  assert.equal(
    harness.debugEvents.some(
      (event) =>
        event[1] === "oauth-storage-summary" &&
        event.includes("context=post-oauth-source-load") &&
        event.includes("localStorageKeys=5") &&
        event.includes("sessionStorageKeys=6") &&
        event.includes("indexedDbDatabases=7") &&
        event.includes("cacheStorageKeys=8"),
    ),
    true,
  );
});

function runPublicLandingProbe(elements) {
  const vm = require("node:vm");
  const document = {
    querySelectorAll(selector) {
      if (selector === "button, [role='button'], a") {
        return elements.filter(
          (element) =>
            element.tag === "button" ||
            element.tag === "a" ||
            element.attrs.role === "button",
        );
      }
      if (selector === 'a[href*="/login"], a[href*="/signin"]') {
        return elements.filter(
          (element) =>
            element.tag === "a" &&
            (String(element.attrs.href || "").includes("/login") ||
              String(element.attrs.href || "").includes("/signin")),
        );
      }
      if (selector === 'a[href*="/signup"], a[href*="/register"]') {
        return elements.filter(
          (element) =>
            element.tag === "a" &&
            (String(element.attrs.href || "").includes("/signup") ||
              String(element.attrs.href || "").includes("/register")),
        );
      }
      return [];
    },
  };

  const context = { document };
  return vm.runInNewContext(publicLandingSignalsProbeScript(), context);
}

function element(tag, attrs = {}) {
  return {
    tag,
    attrs,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
}

test("PUBLIC_AUTH_TITLE_PATTERN recognizes Sign in and signin titles", () => {
  assert.equal(PUBLIC_AUTH_TITLE_PATTERN.test("Sign in to Canva"), true);
  assert.equal(PUBLIC_AUTH_TITLE_PATTERN.test("signin"), true);
});

test("public landing probe counts data-testid and href auth signals", () => {
  const signals = runPublicLandingProbe([
    element("button", { "data-testid": "header-login-button" }),
    element("div", { role: "button", "data-testid": "signup-cta" }),
    element("a", { href: "https://www.canva.com/login" }),
    element("a", { href: "https://www.canva.com/register" }),
  ]);

  assert.equal(signals.loginLinks, 1);
  assert.equal(signals.signupLinks, 1);
  assert.equal(signals.authButtons, 4);
});


test("public landing probe normalizes composed and decomposed localized aria-labels", () => {
  for (const localizedAria of ["Iniciar sesión", "Iniciar sesio\u0301n"]) {
    const signals = runPublicLandingProbe([
      element("button", { "aria-label": localizedAria }),
    ]);

    assert.equal(signals.authButtons, 1);
  }
});

test("public landing probe recognizes localized aria-label without exposing values", async () => {
  const localizedAria = "Entrar na sua conta Canva";
  const signals = runPublicLandingProbe([
    element("button", { "aria-label": localizedAria }),
    element("a", { href: "https://www.canva.com/templates/" }),
  ]);

  assert.equal(signals.authButtons, 1);

  const order = [];
  const sourceTab = createTab(1, 300, order, {
    publicSignals: signals,
    title: "Canva",
    url: "https://www.canva.com/pt_br/",
  });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google";

  harness.webContentsListeners.get("did-navigate")(null, callbackUrl);
  harness.window.webContents.setURL(callbackUrl);
  harness.webContentsListeners.get("did-finish-load")();
  await waitForDebugEvent(harness.debugEvents, "oauth-public-landing-signals");

  const flattenedLogs = JSON.stringify(harness.debugEvents);
  assert.equal(flattenedLogs.includes(localizedAria), false);
  assert.equal(flattenedLogs.includes("aria-label"), false);
  assert.equal(flattenedLogs.includes("href"), false);
  assert.equal(flattenedLogs.includes("data-testid"), false);
});
