// @ts-nocheck
"use strict";

// @ts-check

const assert = require("node:assert/strict");
const test = require("node:test");

const { loadRuntimeModule } = require("./helpers/runtime-module");

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.className = "";
    this.id = "";
    this.textContent = "";
    this.innerHTML = "";
    this.offsetWidth = 96;
    this.offsetHeight = 40;
    this.listeners = new Map();
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    child.parentNode = this;
    const index = this.children.indexOf(reference);
    if (index === -1) {
      this.children.push(child);
    } else {
      this.children.splice(index, 0, child);
    }
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  dispatch(type, event = {}) {
    const listener = this.listeners.get(type);
    if (listener) {
      listener(event);
    }
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

  getContext(kind) {
    assert.equal(kind, "2d");
    return this.context;
  }
}

function createFakeDom(_context) {
  const body = new FakeElement("body");
  function findById(element, id) {
    if (element.id === id) {
      return element;
    }
    for (const child of element.children) {
      const match = findById(child, id);
      if (match) {
        return match;
      }
    }
    return null;
  }
  const document = {
    body,
    documentElement: body,
    createElement(tagName) {
      if (tagName === "canvas") {
        return new FakeCanvas({
          imageSmoothingEnabled: true,
          clearRect() {},
          drawImage() {},
          getImageData() {
            return { data: new Uint8ClampedArray([0, 0, 0, 255]) };
          },
        });
      }
      return new FakeElement(tagName);
    },
    getElementById(id) {
      return findById(body, id);
    },
  };

  return { body, document };
}

test("CLEyeDropper exports the Canva Linux picker API surface", () => {
  const cl = loadRuntimeModule("preload/cl-eyedropper/index");
  const eyedropper = new cl.CLEyeDropper({ overlay: { zIndex: 7 } });

  assert.equal(typeof cl.CLEyeDropper, "function");
  assert.equal(typeof cl.installClEyeDropperScalingPatch, "function");
  assert.equal(typeof cl.removeClEyeDropperUi, "function");
  assert.equal(eyedropper.options.overlay.zIndex, 7);
  assert.equal(eyedropper._rgbToHex(255, 0, 128), "#ff0080");
});

test("CLEyeDropper rejects non-browser environments", () => {
  const { CLEyeDropper } = loadRuntimeModule("preload/cl-eyedropper/index");
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;

  try {
    /** @type {any} */ globalThis.document = undefined;
    /** @type {any} */ globalThis.window = undefined;
    assert.throws(
      () => new CLEyeDropper().open(/** @type {any} */ {}),
      /EyeDropper can only be used in the browser environment/,
    );
  } finally {
    /** @type {any} */ globalThis.document = previousDocument;
    /** @type {any} */ globalThis.window = previousWindow;
  }
});

test("removeClEyeDropperUi removes the overlay id", () => {
  const context = {
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage() {},
    getImageData() {
      return { data: new Uint8ClampedArray([0, 0, 0, 255]) };
    },
  };
  const { body, document } = createFakeDom(context);
  const overlay = new FakeElement("div");
  overlay.id = "eyedropper-overlay";
  body.appendChild(overlay);
  const previousDocument = globalThis.document;

  try {
    /** @type {any} */ globalThis.document = document;
    const { removeClEyeDropperUi } = loadRuntimeModule(
      "preload/cl-eyedropper/index",
    );
    removeClEyeDropperUi();
    assert.equal(body.children.length, 0);
  } finally {
    /** @type {any} */ globalThis.document = previousDocument;
  }
});

test("CLEyeDropper preserves the canvas event model and scaled picking", async () => {
  const reads = [];
  const logs = [];
  const context = {
    imageSmoothingEnabled: true,
    clearRect() {},
    drawImage() {},
    getImageData(x, y, width, height) {
      reads.push({ x, y, width, height });
      return { data: new Uint8ClampedArray([255, 0, 128, 255]) };
    },
  };
  const { body, document } = createFakeDom(context);
  const canvas = new FakeCanvas(context);
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousHtmlCanvasElement = globalThis.HTMLCanvasElement;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;

  const fakeWindow = {
    requestAnimationFrame(callback) {
      callback(0);
      return 1;
    },
  };

  /** @type {any} */ globalThis.document = document;
  /** @type {any} */ globalThis.window = fakeWindow;
  /** @type {any} */ globalThis.HTMLCanvasElement = FakeCanvas;
  /** @type {any} */ globalThis.requestAnimationFrame =
    fakeWindow.requestAnimationFrame;

  try {
    const { CLEyeDropper, installClEyeDropperScalingPatch } = loadRuntimeModule(
      "preload/cl-eyedropper/index",
    );
    installClEyeDropperScalingPatch((...args) => {
      logs.push(args);
    });
    installClEyeDropperScalingPatch(() => {
      throw new Error("patch should be idempotent");
    });
    const eyedropper = new CLEyeDropper({
      magnifier: {
        width: "96px",
        height: "96px",
        size: 18,
        zoom: 6,
      },
    });
    const resultPromise = eyedropper.open(canvas);
    const overlay = body.children[0];

    assert.equal(overlay.id, "eyedropper-overlay");
    assert.equal(overlay.style.pointerEvents, "none");
    assert.equal(typeof canvas.listeners.get("mousemove"), "function");
    assert.equal(typeof canvas.listeners.get("mouseleave"), "function");
    assert.equal(typeof canvas.listeners.get("mouseenter"), "function");
    assert.equal(typeof canvas.listeners.get("click"), "function");

    canvas.dispatch("mouseenter");
    assert.equal(canvas.style.cursor, "none");

    canvas.dispatch("mousemove", { clientX: 60, clientY: 45 });
    assert.deepEqual(reads[0], { x: 100, y: 50, width: 1, height: 1 });

    canvas.dispatch("click", { clientX: 60, clientY: 45 });
    assert.deepEqual(await resultPromise, {
      hex: "#ff0080",
      rgb: [255, 0, 128],
    });
    assert.deepEqual(logs[0], [
      "eyedropper:library",
      "picked",
      "#ff0080",
      100,
      50,
      "[255,0,128]",
    ]);
    assert.equal(body.children.length, 0);
    assert.equal(canvas.style.cursor, "default");
    assert.equal(canvas.listeners.size, 0);
  } finally {
    /** @type {any} */ globalThis.document = previousDocument;
    /** @type {any} */ globalThis.window = previousWindow;
    /** @type {any} */ globalThis.HTMLCanvasElement = previousHtmlCanvasElement;
    /** @type {any} */ globalThis.requestAnimationFrame =
      previousRequestAnimationFrame;
  }
});
