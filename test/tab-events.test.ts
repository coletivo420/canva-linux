// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");

const { attachTabEventHandlers } = loadRuntimeModule("main/tab-events");

function createHarness(classifyWindowOpenRequest, { shell } = {}) {
  const listeners = new Map();
  const registeredPopups = [];
  const createdTabs = [];
  const externalUrls = [];
  const debugLogs = [];
  const wc = {
    id: 42,
    getURL() {
      return "https://www.canva.com/design";
    },
    focus() {},
    loadURL() {},
    executeJavaScript() {
      return Promise.resolve();
    },
    insertCSS() {
      return Promise.resolve();
    },
    setWindowOpenHandler(handler) {
      listeners.set("window-open-handler", handler);
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
  };

  attachTabEventHandlers(
    {
      id: 7,
      title: "Design",
      url: "https://www.canva.com/design",
      favicon: null,
      view: { webContents: wc },
    },
    {
      appName: "Canva",
      appUrl: "https://www.canva.com",
      broadcastTabsState() {},
      classifyNavigationRequest() {
        return { category: "tabs", kind: "external" };
      },
      classifyWindowOpenRequest,
      closeTab() {},
      createTab(url, options) {
        const tab = { url, options };
        createdTabs.push(tab);
        return tab;
      },
      debugLog(...args) {
        debugLogs.push(args);
        return true;
      },
      isBlankPopupUrl(url) {
        return !url || url === "about:blank" || url === "about:srcdoc";
      },
      isCanvaAuthUrl() {
        return false;
      },
      isCanvaUrl(url) {
        return String(url).startsWith("https://www.canva.com/");
      },
      isSafeExternalUrl(url) {
        return String(url).startsWith("https://");
      },
      oauthHelpers: {
        popupWindowOptions() {
          return {};
        },
        registerAuthPopupWindow(window, url, options) {
          registeredPopups.push({ window, url, options });
        },
        openAuthPopupForTab() {},
      },
      shell: shell || {
        openExternal(url) {
          externalUrls.push(url);
        },
      },
      shellBackgroundColor() {
        return "#ffffff";
      },
      switchRelativeTab() {},
    },
  );

  return {
    createdTabs,
    externalUrls,
    listeners,
    registeredPopups,
    debugLogs,
  };
}

test("did-create-window registers only OAuth popups", () => {
  const { listeners, registeredPopups } = createHarness(() => ({
    category: "oauth",
    kind: "oauth-popup",
  }));
  let closed = false;

  listeners.get("did-create-window")(
    {
      close() {
        closed = true;
      },
    },
    {
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      frameName: "google-auth",
      referrer: { url: "https://www.canva.com/login" },
    },
  );

  assert.equal(closed, false);
  assert.equal(registeredPopups.length, 1);
  assert.equal(
    registeredPopups[0].url,
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  assert.equal(registeredPopups[0].options.sourceWebContentsId, 42);
});

test("did-create-window closes and redirects internal tabs instead of registering OAuth popup", () => {
  const { createdTabs, listeners, registeredPopups } = createHarness(() => ({
    category: "tabs",
    kind: "internal-tab",
  }));
  let closed = false;

  listeners.get("did-create-window")(
    {
      close() {
        closed = true;
      },
    },
    {
      url: "https://www.canva.com/design/next",
      frameName: "",
      referrer: { url: "https://www.canva.com/design" },
    },
  );

  assert.equal(closed, true);
  assert.equal(registeredPopups.length, 0);
  assert.deepEqual(createdTabs, [
    {
      url: "https://www.canva.com/design/next",
      options: { activate: true },
    },
  ]);
});

test("did-create-window closes and opens external browser windows without OAuth registration", () => {
  const { externalUrls, listeners, registeredPopups } = createHarness(() => ({
    category: "tabs",
    kind: "external-browser",
  }));
  let closed = false;

  listeners.get("did-create-window")(
    {
      close() {
        closed = true;
      },
    },
    {
      url: "https://example.com/share",
      frameName: "",
      referrer: { url: "https://www.canva.com/design" },
    },
  );

  assert.equal(closed, true);
  assert.equal(registeredPopups.length, 0);
  assert.deepEqual(externalUrls, ["https://example.com/share"]);
});

test("did-create-window logs close diagnostics", () => {
  const { debugLogs, listeners } = createHarness(() => ({
    category: "tabs",
    kind: "internal-tab",
  }));

  listeners.get("did-create-window")(
    {
      close() {},
    },
    {
      url: "https://www.canva.com/design/next",
      frameName: "",
      referrer: { url: "https://www.canva.com/design" },
    },
  );

  assert.ok(
    debugLogs.some(
      ([category, event]) =>
        category === "tabs" && event === "close-created-window",
    ),
  );
});

test("did-create-window logs unavailable close diagnostics", () => {
  const { debugLogs, listeners } = createHarness(() => ({
    category: "tabs",
    kind: "internal-tab",
  }));

  listeners.get("did-create-window")(
    {},
    {
      url: "https://www.canva.com/design/next",
      frameName: "",
      referrer: { url: "https://www.canva.com/design" },
    },
  );

  assert.ok(
    debugLogs.some(
      ([category, event]) =>
        category === "tabs" && event === "close-created-window-unavailable",
    ),
  );
});

test("window open external handling does not require injected shell.openExternal", () => {
  const { listeners, registeredPopups } = createHarness(
    () => ({ category: "tabs", kind: "external-browser" }),
    { shell: {} },
  );

  assert.doesNotThrow(() => {
    const result = listeners.get("window-open-handler")({
      url: "https://example.com/share",
      disposition: "foreground-tab",
      frameName: "",
    });

    assert.deepEqual(result, { action: "deny" });
  });
  assert.equal(registeredPopups.length, 0);
});

test("external navigation blocking does not require injected shell.openExternal", () => {
  const { listeners } = createHarness(
    () => ({ category: "tabs", kind: "external-browser" }),
    { shell: {} },
  );
  let prevented = false;

  assert.doesNotThrow(() => {
    listeners.get("will-navigate")(
      {
        preventDefault() {
          prevented = true;
        },
      },
      "https://example.com/share",
    );
  });
  assert.equal(prevented, true);
});

test("EyeDropper injected diagnostic log includes the concrete tab id expression", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "electron", "main", "tab-events.ts"),
    "utf8",
  );

  assert.match(
    source,
    /console\.log\('\[canva:eyedropper:check\] tab=' \+ \$\{tab\.id\} \+ ' installed='/,
  );
  assert.doesNotMatch(
    source,
    /console\.log\('\[canva:eyedropper:check\] tab=\$\{tab\.id\}/,
  );
});
