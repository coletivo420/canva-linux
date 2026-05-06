// @ts-nocheck
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const repoRoot = path.resolve(__dirname, '..');

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
function withElectronMock(fn) {
  const moduleLoader = /** @type {typeof Module & { _load: (request: string, parent: unknown, isMain: boolean) => unknown }} */ (Module);
  const originalLoad = moduleLoader._load;
  moduleLoader._load = function mockElectron(request, parent, isMain) {
    if (request === 'electron') {
      return {
        ipcRenderer: {
          invoke() {
            return Promise.resolve(null);
          },
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return fn();
  } finally {
    moduleLoader._load = originalLoad;
  }
}

function withFreshCustomFlowElectronMock(invoke, fn) {
  const moduleLoader = /** @type {typeof Module & { _load: (request: string, parent: unknown, isMain: boolean) => unknown }} */ (Module);
  const originalLoad = moduleLoader._load;
  const runtimeFiles = [
    'electron/preload/custom-eyedropper-flow.ts',
    'electron/preload/cl-eyedropper/index.ts',
    'electron/preload/cl-eyedropper/cl-eyedropper.ts',
  ];
  for (const file of runtimeFiles) {
    delete require.cache[require.resolve(path.join(repoRoot, file))];
  }
  moduleLoader._load = function mockElectron(request, parent, isMain) {
    if (request === 'electron') {
      return { ipcRenderer: { invoke } };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return fn();
  } finally {
    moduleLoader._load = originalLoad;
  }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.attributes = {};
    this.className = '';
    this.id = '';
    this.textContent = '';
    this.innerHTML = '';
    this.offsetWidth = 96;
    this.offsetHeight = 40;
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === 'id') this.id = String(value);
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
    super('canvas');
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
    this._src = '';
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
  const body = new FakeElement('body');
  const document = {
    body,
    documentElement: body,
    createElement(tagName) {
      if (tagName === 'canvas') return new FakeCanvas(context);
      return new FakeElement(tagName);
    },
    getElementById(id) {
      return findById(body, id);
    },
  };
  const windowListeners = new Map();
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
  await Promise.resolve();
  await Promise.resolve();
}

test('CL-EyeDropper runtime exports the only picker surface', () => {
  const cl = loadRuntimeModule('preload/cl-eyedropper/index');

  assert.equal(typeof cl.CLEyeDropper, 'function');
  assert.equal(typeof cl.installClEyeDropperScalingPatch, 'function');
  assert.equal(typeof cl.removeClEyeDropperUi, 'function');
});

test('custom EyeDropper flow loads without the removed selector module', () => {
  const selectorModule = ['eye', 'dropper-implementation'].join('');
  const source = fs.readFileSync(path.join(repoRoot, 'electron/preload/custom-eyedropper-flow.ts'), 'utf8');

  assert.equal(source.includes(selectorModule), false);
  assert.equal(typeof withElectronMock(() => loadRuntimeModule('preload/custom-eyedropper-flow')).createCustomEyeDropperFlow, 'function');
});

test('custom EyeDropper flow keeps typed CL-EyeDropper open options', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'electron/preload/custom-eyedropper-flow.ts'), 'utf8');

  assert.match(source, /type EyeDropperOpenOptions = \{ signal\?: AbortSignal \}/);
  assert.match(source, /function wrapOpenCall\(options: EyeDropperOpenOptions = \{\}\): Promise<EyeDropperResult>/);
  assert.equal(source.includes('const signal: any'), false);
  assert.equal(source.includes('typedResult: any'), false);
  assert.equal(source.includes('as any).signal'), false);
});

test('custom EyeDropper flow resolves through CL-EyeDropper snapshot canvas and cleans up', async () => {
  const dom = createCustomFlowDom();
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousHtmlCanvasElement = globalThis.HTMLCanvasElement;
  const previousImage = globalThis.Image;
  const previousLocation = globalThis.location;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;

  /** @type {any} */ (globalThis).document = dom.document;
  /** @type {any} */ (globalThis).window = dom.window;
  /** @type {any} */ (globalThis).HTMLCanvasElement = FakeCanvas;
  /** @type {any} */ (globalThis).Image = FakeImage;
  /** @type {any} */ (globalThis).location = { href: 'https://www.canva.com/design/test' };
  /** @type {any} */ (globalThis).requestAnimationFrame = (callback) => {
    callback(0);
    return 1;
  };

  try {
    const custom = withFreshCustomFlowElectronMock(
      () => Promise.resolve({ dataUrl: 'data:image/png;base64,test', width: 200, height: 100, cssWidth: 100, cssHeight: 50 }),
      () => loadRuntimeModule('preload/custom-eyedropper-flow')
    );
    const flow = custom.createCustomEyeDropperFlow({
      debugLog() {
        return false;
      },
      logEyeDropper() {},
    });

    const resultPromise = flow.wrapOpenCall();
    await flushMicrotasks();

    assert.equal(dom.body.children.length, 2);
    const snapshotHost = dom.body.children.find((child) => child.attributes['data-canva-eyedropper-host'] === 'true');
    assert.ok(snapshotHost);
    assert.equal(snapshotHost.attributes['data-canva-eyedropper-host'], 'true');
    const snapshotCanvas = snapshotHost.children[0];
    assert.equal(snapshotCanvas.width, 200);
    assert.equal(snapshotCanvas.height, 100);

    snapshotCanvas.dispatch('mouseenter');
    snapshotCanvas.dispatch('mousemove', { clientX: 60, clientY: 45 });
    snapshotCanvas.dispatch('click', { clientX: 60, clientY: 45 });

    assert.deepEqual(await resultPromise, { sRGBHex: '#112233' });
    assert.deepEqual(dom.reads[0], { x: 100, y: 50, width: 1, height: 1 });
    assert.equal(dom.body.children.length, 0);
    assert.equal(snapshotCanvas.listeners.size, 0);
    assert.equal(dom.windowListeners.size, 0);
  } finally {
    /** @type {any} */ (globalThis).document = previousDocument;
    /** @type {any} */ (globalThis).window = previousWindow;
    /** @type {any} */ (globalThis).HTMLCanvasElement = previousHtmlCanvasElement;
    /** @type {any} */ (globalThis).Image = previousImage;
    /** @type {any} */ (globalThis).location = previousLocation;
    /** @type {any} */ (globalThis).requestAnimationFrame = previousRequestAnimationFrame;
  }
});

test('source preload modules do not reference removed picker tokens', () => {
  const sourceFiles = [
    'electron/preload/custom-eyedropper-flow.ts',
    'electron/preload/native-eyedropper-wrapper.ts',
    'electron/preload/canva.ts',
  ];

  const removedTokens = [
    ['ltcode', 'eyedropper'].join('-'),
    ['LTCode', 'EyeDropper'].join(''),
    ['install', 'Ltcode', 'ScalingPatch'].join(''),
    ['remove', 'Ltcode', 'Ui'].join(''),
    ['CANVA', 'EYEDROPPER', 'IMPL'].join('_'),
    ['--canva', 'eyedropper', 'impl'].join('-'),
  ];

  for (const file of sourceFiles) {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    for (const token of removedTokens) {
      assert.equal(source.includes(token), false, `${token} should not appear in ${file}`);
    }
  }
});
