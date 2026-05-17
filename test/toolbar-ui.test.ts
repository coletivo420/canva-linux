// @ts-nocheck
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const toolbarPath = path.join(process.cwd(), "electron", "ui", "toolbar.html");

class FakeElement {
  constructor(tagName, id = "") {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.parentNode = null;
    this.className = "";
    this.title = "";
    this.type = "";
    this.alt = "";
    this.src = "";
    this.onerror = null;
    this._textContent = "";
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
    this.children = [];
  }

  get textContent() {
    return this._textContent || this.children.map((child) => child.textContent).join("");
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  click() {
    this.listeners.get("click")?.({ stopPropagation() {} });
  }

  matches(selector) {
    if (selector.startsWith(".")) {
      return this.className.split(/\s+/).includes(selector.slice(1));
    }
    if (selector.startsWith("#")) return this.id === selector.slice(1);
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      if (node.matches(selector)) matches.push(node);
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function createToolbarHarness() {
  const html = fs.readFileSync(toolbarPath, "utf8");
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
  assert.ok(script, "toolbar.html must contain inline toolbar script");

  const documentElement = new FakeElement("html");
  documentElement.dataset = {};
  const pinnedHomeSlot = new FakeElement("div", "pinned-home-slot");
  const tabsEl = new FakeElement("div", "tabs");
  const elementsById = new Map([
    ["pinned-home-slot", pinnedHomeSlot],
    ["tabs", tabsEl],
  ]);
  const sent = [];
  const subscriptions = [];

  const context = {
    console: { log() {}, error() {} },
    window: {
      canvaTabs: {
        getSystemTheme() {
          return "light";
        },
        onState(listener) {
          subscriptions.push(listener);
        },
        send(action, payload) {
          sent.push({ action, payload });
        },
      },
      addEventListener() {},
    },
    document: {
      documentElement,
      getElementById(id) {
        return elementsById.get(id) ?? null;
      },
      createElement(tagName) {
        return new FakeElement(tagName);
      },
    },
  };

  vm.runInNewContext(script, context, { filename: toolbarPath });
  assert.equal(subscriptions.length, 1);
  return { documentElement, pinnedHomeSlot, tabsEl, sent, render: subscriptions[0] };
}

test("render with only home creates pinned home and no regular tabs", () => {
  const harness = createToolbarHarness();
  harness.render({
    activeTabId: 1,
    pinnedHomeTab: { id: 1, title: "Home", url: "https://www.canva.com/", favicon: null, canClose: false, isHome: true },
    tabs: [],
    theme: "dark",
  });

  assert.equal(harness.documentElement.dataset.theme, "dark");
  assert.equal(harness.pinnedHomeSlot.querySelectorAll(".pinned-home").length, 1);
  assert.equal(harness.pinnedHomeSlot.querySelector(".pinned-home").className, "pinned-home active");
  assert.equal(harness.tabsEl.querySelectorAll(".tab").length, 0);
  assert.equal(harness.pinnedHomeSlot.querySelectorAll(".tab-close").length, 0);
});

test("render with home and regular tabs renders home once and regular tabs separately", () => {
  const harness = createToolbarHarness();
  harness.render({
    activeTabId: 3,
    pinnedHomeTab: { id: 1, title: "Home", url: "https://www.canva.com/", favicon: null, canClose: false, isHome: true },
    tabs: [
      { id: 2, title: "Design 1", url: "https://www.canva.com/design/1", favicon: null, canClose: true, isHome: false },
      { id: 3, title: "Design 2", url: "https://www.canva.com/design/2", favicon: null, canClose: true, isHome: false },
    ],
    theme: "light",
  });

  const pinnedHomes = harness.pinnedHomeSlot.querySelectorAll(".pinned-home");
  const regularTabs = harness.tabsEl.querySelectorAll(".tab");
  assert.equal(pinnedHomes.length, 1);
  assert.equal(regularTabs.length, 2);
  assert.equal(pinnedHomes[0].className, "pinned-home");
  assert.equal(regularTabs.filter((tab) => tab.className.includes("active")).length, 1);
  assert.equal(regularTabs[1].className, "tab active");
});

test("pinned home click sends go-home and does not render duplicate home controls", () => {
  const html = fs.readFileSync(toolbarPath, "utf8");
  assert.equal(html.includes('id="home"'), false);

  const harness = createToolbarHarness();
  harness.render({
    activeTabId: 2,
    pinnedHomeTab: { id: 1, title: "Home", url: "https://www.canva.com/", favicon: null, canClose: false, isHome: true },
    tabs: [{ id: 2, title: "Design", url: "https://www.canva.com/design", favicon: null, canClose: true, isHome: false }],
    theme: "light",
  });

  harness.pinnedHomeSlot.querySelector(".pinned-home").click();
  assert.deepEqual(harness.sent, [{ action: "go-home", payload: undefined }]);
});

test("the home tab must not be rendered by the regular tab renderer", () => {
  const harness = createToolbarHarness();
  harness.render({
    activeTabId: 1,
    pinnedHomeTab: { id: 1, title: "Home", url: "https://www.canva.com/", favicon: null, canClose: false, isHome: true },
    tabs: [],
    theme: "light",
  });

  assert.equal(harness.tabsEl.querySelectorAll(".tab").length, 0);
  assert.equal(harness.pinnedHomeSlot.querySelector(".pinned-home").textContent, "Canva");
});
