// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const { createOAuthHelpers } = loadRuntimeModule("main/oauth");

function createFakeWindow(initialUrl = "https://www.canva.com/login") {
  const windowListeners = new Map();
  const webContentsListeners = new Map();
  let destroyed = false;
  let currentUrl = initialUrl;
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
  return {
    id,
    view: {
      webContents: {
        id: webContentsId,
        getURL: () => options.url || "https://www.canva.com/pt_br/",
        reload() {
          order.push(`reload:${id}`);
        },
        reloadIgnoringCache: options.reloadIgnoringCache
          ? () => order.push(`reloadIgnoringCache:${id}`)
          : undefined,
      },
    },
  };
}

function createHarness({
  activeTab,
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

test("authorized callback waits for did-finish-load before reloading", async () => {
  const order = [];
  const sourceTab = createTab(1, 300, order, { reloadIgnoringCache: true });
  const harness = createHarness({ sourceTab });
  harness.order.push = order.push.bind(order);
  const callbackUrl = "https://www.canva.com/oauth/authorized/google?code=secret&state=secret";

  harness.webContentsListeners.get("did-redirect-navigation")(null, callbackUrl);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(harness.entry.sawAuthorizedCallback, true);
  assert.equal(order.includes("reloadIgnoringCache:1"), false);
  assert.equal(harness.window.isDestroyed(), false);
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
      (event) => event[1] === "authorized-callback-ignored-already-handled",
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
