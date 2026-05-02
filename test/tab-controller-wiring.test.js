'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { loadRuntimeModule } = require('./helpers/runtime-module');

const {
  createEyeDropperImplementationArgument,
  createTabController,
} = loadRuntimeModule('main/tab-controller');

class FakeWebContentsView {
  constructor(options = {}) {
    this.options = options;
    this.webContents = {
      loadedUrl: null,
      loadURL: (url) => {
        this.webContents.loadedUrl = url;
      },
    };
  }
}

/**
 * @param {string | undefined} value
 * @param {() => void} fn
 */
function withImplementationEnv(value, fn) {
  const previous = process.env.CANVA_EYEDROPPER_IMPL;
  if (value === undefined) {
    delete process.env.CANVA_EYEDROPPER_IMPL;
  } else {
    process.env.CANVA_EYEDROPPER_IMPL = value;
  }

  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env.CANVA_EYEDROPPER_IMPL;
    } else {
      process.env.CANVA_EYEDROPPER_IMPL = previous;
    }
  }
}

test('createEyeDropperImplementationArgument normalizes the main-process env value for renderer args', () => {
  assert.equal(createEyeDropperImplementationArgument({}), '--canva-eyedropper-impl=cl');
  assert.equal(createEyeDropperImplementationArgument({ CANVA_EYEDROPPER_IMPL: 'legacy' }), '--canva-eyedropper-impl=legacy');
  assert.equal(createEyeDropperImplementationArgument({ CANVA_EYEDROPPER_IMPL: '  ltcode  ' }), '--canva-eyedropper-impl=ltcode');
});

test('createTabController forwards navigation helpers into tab event attachment', () => {
  const attached = [];
  const ensuredViews = [];
  const visibilityCalls = [];
  const layoutCalls = [];

  const classifyNavigationRequest = () => ({ kind: 'external' });
  const classifyWindowOpenRequest = () => ({ category: 'tabs', kind: 'external-browser' });

  const state = {
    tabs: new Map(),
    nextTabIdRef() {
      return 1;
    },
  };

  const tabHelpers = {
    ensureTopLevelView(view) {
      ensuredViews.push(view);
    },
    setTabVisibility(tab, visible) {
      visibilityCalls.push({ tabId: tab.id, visible });
    },
    layoutViews() {
      layoutCalls.push(true);
    },
    switchToTab(id) {
      return id;
    },
    switchRelativeTab(step) {
      return step;
    },
    closeTab(id) {
      return id;
    },
    focusHomeTab({ resetToHome, switchToTab }) {
      return { resetToHome, switchToTab: typeof switchToTab };
    },
  };

  const controller = createTabController({
    appName: 'Canva',
    appUrl: 'https://www.canva.com',
    broadcastTabsState() {},
    classifyNavigationRequest,
    classifyWindowOpenRequest,
    debugLog() {
      return true;
    },
    getCanvaSession() {
      return { partition: 'persist:canva' };
    },
    homeUrl: 'https://www.canva.com',
    isBlankPopupUrl() {
      return false;
    },
    isCanvaAuthUrl() {
      return false;
    },
    isCanvaUrl() {
      return true;
    },
    isSafeExternalUrl() {
      return true;
    },
    oauthHelpers: {},
    shell: {},
    shellBackgroundColor() {
      return '#000000';
    },
    state,
    tabHelpers,
    WebContentsView: FakeWebContentsView,
    attachTabEventHandlersImpl(tab, helpers) {
      attached.push({ tab, helpers });
    },
  });

  const tab = controller.createTab('https://www.canva.com/design', { activate: false });

  assert.equal(attached.length, 1);
  assert.equal(attached[0].tab, tab);
  assert.equal(attached[0].helpers.classifyNavigationRequest, classifyNavigationRequest);
  assert.equal(attached[0].helpers.classifyWindowOpenRequest, classifyWindowOpenRequest);

  assert.equal(state.tabs.size, 1);
  assert.equal(tab.view.webContents.loadedUrl, 'https://www.canva.com/design');
  assert.equal(ensuredViews.length, 1);
  assert.deepEqual(visibilityCalls, [{ tabId: 1, visible: false }]);
  assert.equal(layoutCalls.length, 1);
});

test('createTabController passes EyeDropper selection through additionalArguments', () => {
  withImplementationEnv('legacy', () => {
    const state = {
      tabs: new Map(),
      nextTabIdRef() {
        return 3;
      },
    };

    const controller = createTabController({
      appName: 'Canva',
      appUrl: 'https://www.canva.com',
      broadcastTabsState() {},
      classifyNavigationRequest() {
        return { kind: 'external' };
      },
      classifyWindowOpenRequest() {
        return { category: 'tabs', kind: 'external-browser' };
      },
      debugLog() {
        return true;
      },
      getCanvaSession() {
        return { partition: 'persist:canva' };
      },
      homeUrl: 'https://www.canva.com',
      isBlankPopupUrl() {
        return false;
      },
      isCanvaAuthUrl() {
        return false;
      },
      isCanvaUrl() {
        return true;
      },
      isSafeExternalUrl() {
        return true;
      },
      oauthHelpers: {},
      shell: {},
      shellBackgroundColor() {
        return '#000000';
      },
      state,
      tabHelpers: {
        ensureTopLevelView() {},
        setTabVisibility() {},
        layoutViews() {},
        switchToTab(id) {
          return id;
        },
        switchRelativeTab(step) {
          return step;
        },
        closeTab(id) {
          return id;
        },
        focusHomeTab({ resetToHome, switchToTab }) {
          return { resetToHome, switchToTab: typeof switchToTab };
        },
      },
      WebContentsView: FakeWebContentsView,
      attachTabEventHandlersImpl() {},
    });

    const tab = controller.createTab('https://www.canva.com/design', { activate: false });
    assert.deepEqual(tab.view.options.webPreferences.additionalArguments, ['--canva-eyedropper-impl=legacy']);
  });
});

test('createHomeTab keeps the extracted helpers wired through the controller path', () => {
  const attached = [];

  const classifyNavigationRequest = () => ({ kind: 'external' });
  const classifyWindowOpenRequest = () => ({ category: 'tabs', kind: 'external-browser' });

  const controller = createTabController({
    appName: 'Canva',
    appUrl: 'https://www.canva.com',
    broadcastTabsState() {},
    classifyNavigationRequest,
    classifyWindowOpenRequest,
    debugLog() {
      return true;
    },
    getCanvaSession() {
      return { partition: 'persist:canva' };
    },
    homeUrl: 'https://www.canva.com',
    isBlankPopupUrl() {
      return false;
    },
    isCanvaAuthUrl() {
      return false;
    },
    isCanvaUrl() {
      return true;
    },
    isSafeExternalUrl() {
      return true;
    },
    oauthHelpers: {},
    shell: {},
    shellBackgroundColor() {
      return '#000000';
    },
    state: {
      tabs: new Map(),
      nextTabIdRef() {
        return 2;
      },
    },
    tabHelpers: {
      ensureTopLevelView() {},
      setTabVisibility() {},
      layoutViews() {},
      switchToTab(id) {
        return id;
      },
      switchRelativeTab(step) {
        return step;
      },
      closeTab(id) {
        return id;
      },
      focusHomeTab({ resetToHome, switchToTab }) {
        return { resetToHome, switchToTab: typeof switchToTab };
      },
    },
    WebContentsView: FakeWebContentsView,
    attachTabEventHandlersImpl(tab, helpers) {
      attached.push({ tab, helpers });
    },
  });

  const homeTab = controller.createHomeTab();

  assert.equal(attached.length, 1);
  assert.equal(homeTab.isHome, true);
  assert.equal(attached[0].helpers.classifyNavigationRequest, classifyNavigationRequest);
  assert.equal(attached[0].helpers.classifyWindowOpenRequest, classifyWindowOpenRequest);
});
