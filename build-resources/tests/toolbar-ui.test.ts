import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();
const toolbarPath = path.join(
  repoRoot,
  "build-resources",
  "electron",
  "ui",
  "toolbar.html",
);

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = "";
    this.id = "";
    this.title = "";
    this.type = "";
    this.alt = "";
    this.src = "";
    this.onerror = null;
    this._textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join("");
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "id") this.id = String(value);
    if (name === "class") this.className = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    const event = { stopPropagation() {} };
    for (const listener of this.listeners.get("click") || []) listener(event);
  }

  get classList() {
    const element = this;
    return {
      contains(className) {
        return element.className.split(/\s+/).filter(Boolean).includes(className);
      },
    };
  }

  matches(selector) {
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    if (selector.startsWith(".")) {
      return selector
        .slice(1)
        .split(".")
        .every((className) => this.classList.contains(className));
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelectorAll(selector) {
    const parts = selector.trim().split(/\s+/);
    if (parts.length > 1) {
      const [ancestorSelector, ...descendantParts] = parts;
      const descendantSelector = descendantParts.join(" ");
      return this.querySelectorAll(ancestorSelector).flatMap((node) =>
        node.querySelectorAll(descendantSelector),
      );
    }

    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

function createToolbarHarness() {
  const html = fs.readFileSync(toolbarPath, "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, "toolbar inline script should exist");

  const elements = new Map();
  const documentElement = new FakeElement("html");
  documentElement.dataset = {};
  const body = new FakeElement("body");
  body.dataset = {};
  const pinnedHomeSlot = new FakeElement("div");
  pinnedHomeSlot.id = "pinned-home-slot";
  const tabs = new FakeElement("div");
  tabs.id = "tabs";
  const actions = new FakeElement("div");
  actions.className = "actions";

  body.appendChild(pinnedHomeSlot);
  body.appendChild(tabs);
  body.appendChild(actions);
  elements.set("pinned-home-slot", pinnedHomeSlot);
  elements.set("tabs", tabs);

  const logs = [];
  const errors = [];
  const timers = [];
  const navigations = [];
  const windowListeners = new Map();
  const document = {
    documentElement,
    body,
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelector(selector) {
      return body.querySelector(selector);
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    },
  };
  const window = {
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    removeEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      windowListeners.set(type, listeners.filter((entry) => entry !== listener));
    },
    dispatchEvent(event) {
      for (const listener of windowListeners.get(event.type) || []) listener(event);
      return true;
    },
    matchMedia() {
      return { matches: false };
    },
    location: {
      set href(value) {
        navigations.push(String(value));
      },
      get href() {
        return navigations.at(-1) || "";
      },
    },
  };

  vm.runInNewContext(script, {
    window,
    document,
    console: {
      log(...args) {
        logs.push(args.join(" "));
      },
      error(...args) {
        errors.push(args.join(" "));
      },
      warn(...args) {
        logs.push(args.join(" "));
      },
    },
    Boolean,
    JSON,
    String,
    Error,
    URL,
    setTimeout(callback) {
      timers.push(callback);
      return callback;
    },
    clearTimeout(callback) {
      const index = timers.indexOf(callback);
      if (index >= 0) timers.splice(index, 1);
    },
  });

  assert.equal(typeof window.__canvaToolbarApplyState, "function");
  return {
    actions,
    document,
    errors,
    logs,
    navigations,
    pinnedHomeSlot,
    get render() {
      return window.__canvaToolbarApplyState;
    },
    runTimers() {
      for (const timer of timers.splice(0)) timer();
    },
    tabs,
    window,
  };
}

const homeTab = {
  id: 1,
  title: "Home",
  url: "https://www.canva.com/",
  favicon: null,
  canClose: false,
  isHome: true,
};
const designTab = {
  id: 2,
  title: "Design",
  url: "https://www.canva.com/design",
  favicon: null,
  canClose: true,
  isHome: false,
};
const docsTab = {
  id: 3,
  title: "Docs",
  url: "https://www.canva.com/docs",
  favicon: null,
  canClose: true,
  isHome: false,
};

test("render with only home creates pinned home and no regular tab", () => {
  const { document, render } = createToolbarHarness();

  render({ activeTabId: 1, pinnedHomeTab: homeTab, tabs: [], theme: "light" });

  assert.equal(document.querySelectorAll(".pinned-home").length, 1);
  assert.equal(document.querySelectorAll(".tab").length, 0);
  assert.equal(document.querySelector(".pinned-home").classList.contains("active"), true);
  assert.equal(document.querySelector(".pinned-home .tab-close"), null);
});

test("toolbar defines __canvaToolbarApplyState", () => {
  const { render } = createToolbarHarness();

  assert.equal(typeof render, "function");
});

test("toolbar waits for main-driven state", () => {
  const { document, errors, logs, pinnedHomeSlot, tabs } = createToolbarHarness();

  assert.equal(document.body.dataset.state, "waiting");
  assert.equal(pinnedHomeSlot.textContent, "");
  assert.equal(tabs.textContent, "");
  assert.equal(logs.some((line) => line.includes("[toolbar-ui] subscribe-tabs-state")), false);
  assert.equal(errors.some((line) => line.includes("[toolbar-ui] state-timeout")), false);
});

test("toolbar marks state-timeout when main state is not applied", () => {
  const { document, errors, runTimers } = createToolbarHarness();

  runTimers();

  assert.equal(document.body.dataset.state, "failed");
  assert.ok(errors.some((line) => line.includes("[toolbar-ui] state-timeout")));
});

test("toolbar renders state from __canvaToolbarApplyState", () => {
  const { document, errors, render } = createToolbarHarness();

  render({
    activeTabId: 2,
    pinnedHomeTab: homeTab,
    tabs: [designTab],
    theme: "light",
  });

  assert.equal(document.body.dataset.state, "ready");
  assert.equal(document.querySelectorAll(".pinned-home").length, 1);
  assert.equal(document.querySelectorAll(".tab").length, 1);
  assert.match(document.querySelector(".tab.active").textContent, /Design/);
  assert.equal(errors.some((line) => line.includes("[toolbar-ui] state-timeout")), false);
});

test("toolbar never marks state failed after main state renders", () => {
  const { document, errors, render, runTimers } = createToolbarHarness();

  render({
    activeTabId: 1,
    pinnedHomeTab: homeTab,
    tabs: [],
    theme: "light",
  });
  runTimers();

  assert.equal(document.body.dataset.state, "ready");
  assert.equal(errors.some((line) => line.includes("[toolbar-ui] state-timeout")), false);
});

test("render with home and regular tabs keeps home out of regular renderer", () => {
  const { document, render } = createToolbarHarness();

  render({
    activeTabId: 2,
    pinnedHomeTab: homeTab,
    tabs: [designTab, docsTab],
    theme: "light",
  });

  assert.equal(document.querySelectorAll(".pinned-home").length, 1);
  assert.equal(document.querySelectorAll(".tab").length, 2);
  assert.equal(document.querySelector(".pinned-home").classList.contains("active"), false);
  assert.equal(document.querySelectorAll(".tab.active").length, 1);
  assert.match(document.querySelector(".tab.active").textContent, /Design/);
});

test("toolbar renders pinnedHomeTab inside pinned-home-slot", () => {
  const { pinnedHomeSlot, render } = createToolbarHarness();

  render({ activeTabId: 1, pinnedHomeTab: homeTab, tabs: [designTab], theme: "light" });

  assert.equal(pinnedHomeSlot.querySelectorAll(".pinned-home").length, 1);
});

test("toolbar renders normal tabs inside tabs container", () => {
  const { render, tabs } = createToolbarHarness();

  render({ activeTabId: 2, pinnedHomeTab: homeTab, tabs: [designTab, docsTab], theme: "light" });

  assert.equal(tabs.querySelectorAll(".tab").length, 2);
});

test("home remains excluded from regular tabs", () => {
  const { render, tabs } = createToolbarHarness();

  render({ activeTabId: 1, pinnedHomeTab: homeTab, tabs: [], theme: "light" });

  assert.equal(tabs.querySelectorAll(".tab").length, 0);
});

test("pinned home renders tab.title as label", () => {
  const { document, render } = createToolbarHarness();

  render({ activeTabId: 1, pinnedHomeTab: homeTab, tabs: [], theme: "light" });

  assert.equal(document.querySelector(".pinned-home").textContent, "Home");
});

test("pinned home favicon fallback clears onerror before setting iconPath", () => {
  const { document, render } = createToolbarHarness();

  render({ activeTabId: 1, pinnedHomeTab: homeTab, tabs: [], theme: "light" });
  const favicon = document.querySelector(".pinned-home img");

  favicon.onerror();

  assert.equal(favicon.onerror, null);
  assert.equal(favicon.src, "../assets/canva-icon.png");
});

test("regular tab favicon fallback clears onerror before setting iconPath", () => {
  const { document, render } = createToolbarHarness();

  render({ activeTabId: 2, pinnedHomeTab: homeTab, tabs: [designTab], theme: "light" });
  const favicon = document.querySelector(".tab-favicon");

  favicon.onerror();

  assert.equal(favicon.onerror, null);
  assert.equal(favicon.src, "../assets/canva-icon.png");
});

test("pinned home click sends go-home and no duplicate home button exists", () => {
  const { actions, document, navigations, render } = createToolbarHarness();

  render({ activeTabId: 2, pinnedHomeTab: homeTab, tabs: [designTab], theme: "light" });
  document.querySelector(".pinned-home").click();

  assert.deepEqual(navigations, ["canva-toolbar://go-home"]);
  assert.equal(document.querySelector("#home"), null);
  assert.equal(actions.querySelector("#home"), null);
});

test("toolbar sends switch-tab through canva-toolbar navigation URL", () => {
  const { document, navigations, render } = createToolbarHarness();

  render({
    activeTabId: 1,
    pinnedHomeTab: homeTab,
    tabs: [designTab],
    theme: "light",
  });
  document.querySelector(".tab-activate").click();

  assert.deepEqual(navigations, ["canva-toolbar://switch-tab?id=2"]);
});

test("toolbar sends close-tab through canva-toolbar navigation URL", () => {
  const { document, navigations, render } = createToolbarHarness();

  render({
    activeTabId: 2,
    pinnedHomeTab: homeTab,
    tabs: [designTab],
    theme: "light",
  });
  document.querySelector(".tab-close").click();

  assert.deepEqual(navigations, ["canva-toolbar://close-tab?id=2"]);
});

test("toolbar sends go-home through canva-toolbar navigation URL", () => {
  const { document, navigations, render } = createToolbarHarness();

  render({
    activeTabId: 2,
    pinnedHomeTab: homeTab,
    tabs: [designTab],
    theme: "light",
  });
  document.querySelector(".pinned-home").click();

  assert.deepEqual(navigations, ["canva-toolbar://go-home"]);
});

test("toolbar defines canva-toolbar action channel", () => {
  const html = fs.readFileSync(toolbarPath, "utf8");
  assert.equal(html.includes("canva-toolbar://"), true);
});

test("toolbar defines __canvaToolbarApplyState state contract", () => {
  const html = fs.readFileSync(toolbarPath, "utf8");
  assert.equal(html.includes("__canvaToolbarApplyState"), true);
  assert.equal(html.includes("__canvaToolbarRenderState"), false);
});

test("toolbar does not reference canvaTabs bridge APIs", () => {
  const html = fs.readFileSync(toolbarPath, "utf8");
  assert.equal(html.includes("canvaTabs"), false);
  assert.equal(html.includes("subscribeTabsState"), false);
  assert.equal(html.includes("bridge-initialization-failed"), false);
});

test("toolbar does not render duplicate brand slot", () => {
  const { document } = createToolbarHarness();
  assert.equal(document.querySelector(".brand"), null);
});

test("pinned home strips Canva suffix", () => {
  const { document, render } = createToolbarHarness();

  render({
    activeTabId: 1,
    pinnedHomeTab: { ...homeTab, title: "Home - Canva" },
    tabs: [],
    theme: "light",
  });

  assert.equal(document.querySelector(".pinned-home").textContent, "Home");

  render({
    activeTabId: 1,
    pinnedHomeTab: { ...homeTab, title: "Home - Canva Linux" },
    tabs: [],
    theme: "light",
  });

  assert.equal(document.querySelector(".pinned-home").textContent, "Home");
});

test("missing pinned home title falls back to Home", () => {
  const { document, render } = createToolbarHarness();

  render({
    activeTabId: 1,
    pinnedHomeTab: { ...homeTab, title: "" },
    tabs: [],
    theme: "light",
  });

  assert.equal(document.querySelector(".pinned-home").textContent, "Home");
});
