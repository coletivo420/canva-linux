import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { loadRuntimeModule, withElectronMock } from "./helpers/runtime-module.js";

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || process.cwd();

function withFreshCustomFlowElectronMock(invoke, fn) {
  const previousRequire = globalThis.require;
  globalThis.require = (moduleName) => {
    assert.equal(moduleName, "electron");
    return { contextBridge: {}, ipcRenderer: { invoke } };
  };
  return withElectronMock({ ipcRenderer: { invoke } }, fn).finally(() => {
    if (previousRequire === undefined) delete globalThis.require;
    else globalThis.require = previousRequire;
  });
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.attributes = {};
    this.className = "";
    this.id = "";
    this.textContent = "";
    this.innerHTML = "";
    this.offsetWidth = 96;
    this.offsetHeight = 40;
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    child.parentNode = this;
    const index = this.children.indexOf(reference);
    if (index === -1) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) this.listeners.delete(type);
  }

  dispatch(type, event = {}) {
    const listener = this.listeners.get(type);
    if (listener) listener(event);
  }
}

class FakeCanvas extends FakeElement {
  constructor(context, rect = { left: 10, top: 20, width: 100, height: 50 }) {
    super("canvas");
    this.width = 200;
    this.height = 100;
    this.context = context;
    this.rect = rect;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  getContext() {
    return this.context;
  }
}

class FakeImage {
  constructor() {
    this.naturalWidth = 200;
    this.naturalHeight = 100;
    this.onload = null;
    this.onerror = null;
    this._src = "";
  }

  set src(value) {
    this._src = value;
    queueMicrotask(() => {
      if (this.onload) this.onload();
    });
  }

  get src() {
    return this._src;
  }
}

function findById(element, id) {
  if (element.id === id) return element;
  for (const child of element.children) {
    const match = findById(child, id);
    if (match) return match;
  }
  return null;
}

function createCustomFlowDom() {
  const reads = [];
  const context = {
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage() {},
    getImageData(x, y, width, height) {
      reads.push({ x, y, width, height });
      return { data: new Uint8ClampedArray([17, 34, 51, 255]) };
    },
  };
  const body = new FakeElement("body");
  const windowListeners = new Map();
  const document = {
    body,
    documentElement: body,
    addEventListener(type, listener) {
      windowListeners.set(`document:${type}`, listener);
    },
    removeEventListener(type, listener) {
      if (windowListeners.get(`document:${type}`) === listener) {
        windowListeners.delete(`document:${type}`);
      }
    },
    createElement(tagName) {
      if (tagName === "canvas") return new FakeCanvas(context);
      return new FakeElement(tagName);
    },
    getElementById(id) {
      return findById(body, id);
    },
  };
  const window = {
    innerWidth: 100,
    innerHeight: 50,
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (windowListeners.get(type) === listener) windowListeners.delete(type);
    },
  };
  return { body, document, reads, window, windowListeners };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

test("CL-EyeDropper runtime exports the only picker surface", async () => {
  const cl = await loadRuntimeModule("preload/cl-eyedropper/index");

  assert.equal(typeof cl.CLEyeDropper, "function");
  assert.equal(typeof cl.installClEyeDropperScalingPatch, "function");
  assert.equal(typeof cl.removeClEyeDropperUi, "function");
});

test("custom EyeDropper flow loads without the removed selector module", async () => {
  const selectorModule = ["eye", "dropper-implementation"].join("");
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources/electron/preload/custom-eyedropper-flow.ts"),
    "utf8",
  );

  assert.equal(source.includes(selectorModule), false);
  assert.equal(
    typeof (
      await withElectronMock(
        { ipcRenderer: { invoke: () => Promise.resolve(null) } },
        () => loadRuntimeModule("preload/custom-eyedropper-flow"),
      )
    ).createCustomEyeDropperFlow,
    "function",
  );
});

test("custom EyeDropper flow keeps typed CL-EyeDropper open options", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "build-resources/electron/preload/custom-eyedropper-flow.ts"),
    "utf8",
  );

  assert.match(
    source,
    /type EyeDropperOpenOptions = \{ signal\?: AbortSignal \}/,
  );
  assert.match(
    source,
    /function\s+wrapOpenCall\(\s*options:\s*EyeDropperOpenOptions\s*=\s*\{\},?\s*\):\s*Promise<EyeDropperResult>/,
  );
  assert.equal(source.includes("const signal: any"), false);
  assert.equal(source.includes("typedResult: any"), false);
  assert.equal(source.includes("as any).signal"), false);
});

test("custom EyeDropper flow resolves through CL-EyeDropper snapshot canvas and cleans up", async () => {
  const dom = createCustomFlowDom();
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousHtmlCanvasElement = globalThis.HTMLCanvasElement;
  const previousImage = globalThis.Image;
  const previousLocation = globalThis.location;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousRequire = globalThis.require;
  const previousAddEventListener = globalThis.addEventListener;
  const previousRemoveEventListener = globalThis.removeEventListener;

  /** @type {any} */ globalThis.document = dom.document;
  /** @type {any} */ globalThis.window = dom.window;
  /** @type {any} */ globalThis.HTMLCanvasElement = FakeCanvas;
  /** @type {any} */ globalThis.Image = FakeImage;
  /** @type {any} */ globalThis.location = {
    href: "https://www.canva.com/design/test",
  };
  /** @type {any} */ globalThis.requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };
  /** @type {any} */ globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
  /** @type {any} */ globalThis.removeEventListener = dom.window.removeEventListener.bind(dom.window);

  try {
    const custom = await withFreshCustomFlowElectronMock(
      () =>
        Promise.resolve({
          dataUrl: "data:image/png;base64,test",
          width: 200,
          height: 100,
          cssWidth: 100,
          cssHeight: 50,
        }),
      () => loadRuntimeModule("preload/custom-eyedropper-flow"),
    );
    const flow = custom.createCustomEyeDropperFlow({
      debugLog() {
        return false;
      },
      logEyeDropper() {},
    });
    globalThis.require = (moduleName) => {
      assert.equal(moduleName, "electron");
      return {
        contextBridge: {},
        ipcRenderer: {
          invoke: () =>
            Promise.resolve({
              dataUrl: "data:image/png;base64,test",
              width: 200,
              height: 100,
              cssWidth: 100,
              cssHeight: 50,
            }),
        },
      };
    };

    const resultPromise = flow.wrapOpenCall();
    await flushMicrotasks();

    assert.equal(dom.body.children.length, 2);
    const snapshotHost = dom.body.children.find(
      (child) => child.attributes["data-canva-eyedropper-host"] === "true",
    );
    assert.ok(snapshotHost);
    assert.equal(snapshotHost.attributes["data-canva-eyedropper-host"], "true");
    const snapshotCanvas = snapshotHost.children[0];
    assert.equal(snapshotCanvas.width, 200);
    assert.equal(snapshotCanvas.height, 100);

    snapshotCanvas.dispatch("mouseenter");
    snapshotCanvas.dispatch("mousemove", { clientX: 60, clientY: 45 });
    snapshotCanvas.dispatch("click", { clientX: 60, clientY: 45 });

    assert.deepEqual(await resultPromise, { sRGBHex: "#112233" });
    assert.deepEqual(dom.reads[0], { x: 100, y: 50, width: 1, height: 1 });
    assert.equal(dom.body.children.length, 0);
    assert.equal(snapshotCanvas.listeners.size, 0);
    assert.equal(dom.windowListeners.size, 0);
  } finally {
    /** @type {any} */ globalThis.document = previousDocument;
    /** @type {any} */ globalThis.window = previousWindow;
    /** @type {any} */ globalThis.HTMLCanvasElement = previousHtmlCanvasElement;
    /** @type {any} */ globalThis.Image = previousImage;
    /** @type {any} */ globalThis.location = previousLocation;
    /** @type {any} */ globalThis.requestAnimationFrame =
      previousRequestAnimationFrame;
    if (previousRequire === undefined) delete globalThis.require;
    else globalThis.require = previousRequire;
    /** @type {any} */ globalThis.addEventListener = previousAddEventListener;
    /** @type {any} */ globalThis.removeEventListener = previousRemoveEventListener;
  }
});

test("source preload modules do not reference removed picker tokens", () => {
  const sourceFiles = [
    "build-resources/electron/preload/custom-eyedropper-flow.ts",
    "build-resources/electron/preload/native-eyedropper-wrapper.ts",
    "build-resources/electron/preload/canva.ts",
  ];

  const removedTokens = [
    ["ltcode", "eyedropper"].join("-"),
    ["LTCode", "EyeDropper"].join(""),
    ["install", "Ltcode", "ScalingPatch"].join(""),
    ["remove", "Ltcode", "Ui"].join(""),
    ["CANVA", "EYEDROPPER", "IMPL"].join("_"),
    ["--canva", "eyedropper", "impl"].join("-"),
  ];

  for (const file of sourceFiles) {
    const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
    for (const token of removedTokens) {
      assert.equal(
        source.includes(token),
        false,
        `${token} should not appear in ${file}`,
      );
    }
  }
});
