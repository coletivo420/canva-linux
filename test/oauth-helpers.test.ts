// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const {
  createOAuthHelpers,
  createOAuthPopupInitialState,
  createOAuthPopupOptionsSummary,
} = loadRuntimeModule("main/oauth");

function fakeWindow() {
  return {
    webContents: {
      getURL: () => "about:blank",
      getLastWebPreferences: () => ({
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      }),
      on() {},
      once() {},
      setWindowOpenHandler() {},
      loadURL() {},
    },
    isDestroyed: () => false,
    destroy() {},
    focus() {},
    show() {},
    loadURL() {},
    setTitle() {},
    setMenuBarVisibility() {},
    setBackgroundColor() {},
    getBounds: () => ({ x: 0, y: 0, width: 520, height: 760 }),
    once() {},
    on() {},
  };
}

test("creates OAuth popup initial state for Canva auth opener", () => {
  const entry = createOAuthPopupInitialState({
    popupId: 1,
    window: fakeWindow(),
    startUrl: "about:blank",
    openerUrl: "https://www.canva.com/login",
    sourceWebContentsId: 10,
    isCanvaAuthUrl: (/** @type {string} */ url) => url.includes("/login"),
    isOAuthProviderUrl: () => false,
  });

  assert.equal(entry.id, 1);
  assert.equal(entry.startedOnCanvaAuth, true);
  assert.equal(entry.sawExternalProvider, false);
  assert.equal(entry.sawAuthorizedCallback, false);
  assert.equal(entry.completionHandled, false);
  assert.equal(entry.pendingCallbackUrl, "");
  assert.equal(entry.pendingCallbackType, null);
  assert.equal(entry.authorizedCallbackFallbackQueued, false);
  assert.equal(entry.closeReason, "unknown");
  assert.equal(entry.sourceWebContentsId, 10);
});

test("creates OAuth popup initial state for external provider", () => {
  const entry = createOAuthPopupInitialState({
    popupId: 2,
    window: fakeWindow(),
    startUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    openerUrl: "https://www.canva.com/login",
    sourceWebContentsId: null,
    isCanvaAuthUrl: (/** @type {string} */ url) =>
      url.includes("canva.com/login"),
    isOAuthProviderUrl: (/** @type {string} */ url) =>
      url.includes("accounts.google.com"),
  });

  assert.equal(entry.startedOnCanvaAuth, true);
  assert.equal(entry.sawExternalProvider, true);
  assert.equal(entry.sourceWebContentsId, null);
});

test("OAuth popup close handler prevents premature window close before callback", () => {
  const authPopups = new Map();
  const windowListeners = new Map();
  const webContentsListeners = new Map();
  const window = {
    webContents: {
      session: { partition: "persist:canva" },
      getURL: () => "https://accounts.google.com/o/oauth2/v2/auth",
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
      loadURL() {},
    },
    isDestroyed: () => false,
    destroy() {},
    focus() {},
    show() {},
    loadURL() {},
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
  const helpers = createOAuthHelpers({
    appIconPath: "/tmp/icon.png",
    appName: "Canva Linux",
    authPopups,
    BrowserWindow: function FakeBrowserWindow() {
      return window;
    },
    classifyNavigationRequest() {
      return { kind: "blocked-external" };
    },
    debugLog() {
      return true;
    },
    detectCanvaOAuthCallback() {
      return null;
    },
    extractHostname() {
      return "";
    },
    flushSession: async () => {},
    getActiveTab() {
      return undefined;
    },
    getCanvaSession() {
      return window.webContents.session;
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
      return 9;
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
    window,
    "https://accounts.google.com/o/oauth2/v2/auth",
    {
      openerUrl: "https://www.canva.com/login",
      sourceWebContentsId: 1,
    },
  );
  let prevented = false;

  windowListeners.get("close")({
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(entry.closeReason, "closed-before-callback");
  assert.equal(authPopups.has(9), true);
});


test("summarizes OAuth popup web preferences from one snapshot", () => {
  let calls = 0;
  const window = fakeWindow();
  window.webContents.session = { partition: "persist:canva" };
  window.webContents.getLastWebPreferences = () => {
    calls += 1;
    return {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    };
  };

  assert.deepEqual(createOAuthPopupOptionsSummary(window), {
    partition: "persist:canva",
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  });
  assert.equal(calls, 1);
});

test("OAuth popup stays hidden until ready-to-show", () => {
  const authPopups = new Map();
  const windowListeners = new Map();
  const debugEvents = [];
  let focusCount = 0;
  let showCount = 0;
  const window = fakeWindow();
  window.webContents.session = { partition: "persist:canva" };
  window.focus = () => {
    focusCount += 1;
  };
  window.show = () => {
    showCount += 1;
  };
  window.once = (event, listener) => {
    windowListeners.set(`once:${event}`, listener);
  };
  window.on = (event, listener) => {
    windowListeners.set(event, listener);
  };

  const helpers = createOAuthHelpers({
    appIconPath: "/tmp/icon.png",
    appName: "Canva Linux",
    authPopups,
    BrowserWindow: function FakeBrowserWindow() {
      return window;
    },
    classifyNavigationRequest() {
      return { kind: "blocked-external" };
    },
    debugLog(...args) {
      debugEvents.push(args);
      return true;
    },
    detectCanvaOAuthCallback() {
      return null;
    },
    extractHostname() {
      return "";
    },
    flushSession: async () => {},
    getActiveTab() {
      return undefined;
    },
    getCanvaSession() {
      return window.webContents.session;
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
      return 10;
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

  assert.equal(helpers.popupWindowOptions(() => "#fff").show, false);

  helpers.registerAuthPopupWindow(window, "https://accounts.google.com", {
    openerUrl: "https://www.canva.com/login",
  });

  assert.equal(showCount, 0);
  assert.equal(focusCount, 0);

  windowListeners.get("once:ready-to-show")();

  assert.equal(showCount, 1);
  assert.equal(focusCount, 1);
  assert.equal(
    debugEvents.some(
      (event) => event[0] === "oauth" && event[1] === "popup-ready",
    ),
    true,
  );
});

test("OAuth popup ready-to-show ignores destroyed window", () => {
  const authPopups = new Map();
  const windowListeners = new Map();
  const debugEvents = [];
  let focusCount = 0;
  let showCount = 0;
  let getBoundsCount = 0;
  const window = fakeWindow();
  window.webContents.session = { partition: "persist:canva" };
  window.isDestroyed = () => true;
  window.focus = () => {
    focusCount += 1;
  };
  window.show = () => {
    showCount += 1;
  };
  window.getBounds = () => {
    getBoundsCount += 1;
    return { x: 0, y: 0, width: 520, height: 760 };
  };
  window.once = (event, listener) => {
    windowListeners.set(`once:${event}`, listener);
  };
  window.on = (event, listener) => {
    windowListeners.set(event, listener);
  };

  const helpers = createOAuthHelpers({
    appIconPath: "/tmp/icon.png",
    appName: "Canva Linux",
    authPopups,
    BrowserWindow: function FakeBrowserWindow() {
      return window;
    },
    classifyNavigationRequest() {
      return { kind: "blocked-external" };
    },
    debugLog(...args) {
      debugEvents.push(args);
      return true;
    },
    detectCanvaOAuthCallback() {
      return null;
    },
    extractHostname() {
      return "";
    },
    flushSession: async () => {},
    getActiveTab() {
      return undefined;
    },
    getCanvaSession() {
      return window.webContents.session;
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
      return 10;
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

  helpers.registerAuthPopupWindow(window, "https://accounts.google.com", {
    openerUrl: "https://www.canva.com/login",
  });

  windowListeners.get("once:ready-to-show")();

  assert.equal(showCount, 0);
  assert.equal(focusCount, 0);
  assert.equal(getBoundsCount, 0);
  for (const marker of [
    "popup-ready",
    "popup-ready-to-show",
    "popup-bounds",
  ]) {
    assert.equal(
      debugEvents.some(
        (event) => event[0] === "oauth" && event[1] === marker,
      ),
      false,
      `Marker ${marker} should not be logged for a destroyed window`,
    );
  }
});

test("OAuth callback navigation is logged separately from authorized callback", async () => {
  const authPopups = new Map();
  const webContentsListeners = new Map();
  const debugEvents = [];
  const window = fakeWindow();
  window.webContents.session = { partition: "persist:canva" };
  window.webContents.on = (event, listener) => {
    webContentsListeners.set(event, listener);
  };
  window.webContents.setWindowOpenHandler = (listener) => {
    webContentsListeners.set("window-open-handler", listener);
  };

  const helpers = createOAuthHelpers({
    appIconPath: "/tmp/icon.png",
    appName: "Canva Linux",
    authPopups,
    BrowserWindow: function FakeBrowserWindow() {
      return window;
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
      return "";
    },
    flushSession: async () => {},
    getActiveTab() {
      return undefined;
    },
    getCanvaSession() {
      return window.webContents.session;
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
      return 11;
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
    window,
    "https://www.canva.com/login",
    {},
  );
  const callbackUrl =
    "https://www.canva.com/oauth/provider-callback?code=secret-code&state=secret-state&source=popup";
  const redactedCallbackLogUrl =
    "https://www.canva.com/oauth/provider-callback?code=%5Bredacted%5D&state=%5Bredacted%5D&source=popup";

  webContentsListeners.get("did-navigate")(null, callbackUrl);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(entry.pendingCallbackUrl, callbackUrl);
  assert.equal(entry.pendingCallbackType, "oauth");
  assert.equal(entry.sawAuthorizedCallback, false);
  assert.equal(
    debugEvents.some(
      (event) =>
        event[0] === "oauth" &&
        event[1] === "popup-canva-callback-detected" &&
        event[2] === "popup=11" &&
        event[3] === "type=oauth" &&
        event[4] === redactedCallbackLogUrl,
    ),
    true,
  );
  assert.equal(
    debugEvents.flat().includes(callbackUrl),
    false,
    "Full OAuth callback URL should not be logged",
  );
});
