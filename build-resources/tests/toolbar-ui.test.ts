// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..");
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
  const pinnedHomeSlot = new FakeElement("div");
  pinnedHomeSlot.id = "pinned-home-slot";
  pinnedHomeSlot.className = "pinned-home-slot";
  const tabs = new FakeElement("div");
  tabs.id = "tabs";
  tabs.className = "tabs";
  const actions = new FakeElement("div");
  actions.className = "actions";

  body.appendChild(pinnedHomeSlot);
  body.appendChild(tabs);
  body.appendChild(actions);
  elements.set("pinned-home-slot", pinnedHomeSlot);
  elements.set("tabs", tabs);

  const sent = [];
  let renderState = null;
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
    canvaTabs: {
      getSystemTheme() {
        return "light";
      },
      onState(callback) {
        renderState = callback;
      },
      send(channel, payload) {
        sent.push({ channel, payload });
      },
    },
    addEventListener() {},
  };

  vm.runInNewContext(script, {
    window,
    document,
    console: { log() {}, error() {} },
    Boolean,
    JSON,
    String,
    Error,
  });

  assert.equal(typeof renderState, "function");
  return { actions, document, pinnedHomeSlot, render: renderState, sent, tabs };
}

function toolbarHtml() {
  return fs.readFileSync(toolbarPath, "utf8");
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

test("toolbar does not render duplicate brand slot before pinned home", () => {
  const html = toolbarHtml();

  assert.equal(html.includes('class="brand"'), false);
  assert.equal(html.includes("<span>Canva</span>"), false);
  assert.match(
    html,
    /<div class="tab-strip">\s*<div class="pinned-home-slot" id="pinned-home-slot"><\/div>/,
  );
});

test("pinned home remains inside pinned-home-slot", () => {
  const { pinnedHomeSlot, render } = createToolbarHarness();

  render({ activeTabId: 1, pinnedHomeTab: homeTab, tabs: [], theme: "light" });

  assert.equal(pinnedHomeSlot.querySelectorAll(".pinned-home").length, 1);
});

test("home is excluded from regular tabs", () => {
  const { document, render } = createToolbarHarness();

  render({
    activeTabId: 1,
    pinnedHomeTab: homeTab,
    tabs: [designTab],
    theme: "light",
  });

  assert.equal(document.querySelectorAll(".pinned-home").length, 1);
  assert.equal(document.querySelectorAll(".tabs .pinned-home").length, 0);
  assert.equal(document.querySelectorAll(".tab").length, 1);
});

test("pinned home renders localized title without Canva suffix", () => {
  for (const [rawTitle, expected] of [
    ["Início - Canva", "Início"],
    ["Inicio - Canva", "Inicio"],
    ["Home - Canva", "Home"],
    ["Accueil - Canva", "Accueil"],
    ["Inicio – Canva", "Inicio"],
    ["Inicio — Canva", "Inicio"],
  ]) {
    const { document, render } = createToolbarHarness();

    render({
      activeTabId: 1,
      pinnedHomeTab: { ...homeTab, title: rawTitle },
      tabs: [],
      theme: "light",
    });

    const pinnedHome = document.querySelector(".pinned-home");
    assert.equal(pinnedHome.textContent, expected, rawTitle);
    assert.equal(pinnedHome.title, expected, rawTitle);
  }
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

test("pinned home label does not include Canva when title has Canva suffix", () => {
  const { document, render } = createToolbarHarness();

  render({
    activeTabId: 1,
    pinnedHomeTab: { ...homeTab, title: "Canva - Início - Canva Linux" },
    tabs: [],
    theme: "light",
  });

  assert.equal(document.querySelector(".pinned-home").textContent, "Início");
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
  const { actions, document, render, sent } = createToolbarHarness();

  render({ activeTabId: 2, pinnedHomeTab: homeTab, tabs: [designTab], theme: "light" });
  document.querySelector(".pinned-home").click();

  assert.deepEqual(sent, [{ channel: "go-home", payload: undefined }]);
  assert.equal(document.querySelector("#home"), null);
  assert.equal(actions.querySelector("#home"), null);
});
