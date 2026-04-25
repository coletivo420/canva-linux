'use strict';

const { createPreloadDebug } = require('./debug');
const { installUploadDiagnostics } = require('./upload-diagnostics');

function loadEyeDropperRoutingDiagnostics() {
  try {
    return require('./eyedropper-routing-diagnostics');
  } catch (primaryError) {
    try {
      return require('./browser-capture-diagnostics');
    } catch (fallbackError) {
      return {
        installEyeDropperRoutingDiagnostics() {},
        loadError: fallbackError || primaryError,
      };
    }
  }
}

function loadCustomEyeDropperFlow() {
  try {
    return {
      ...require('./custom-eyedropper-flow'),
      loadError: null,
    };
  } catch (error) {
    return {
      createCustomEyeDropperFlow() {
        return {
          wrapOpenCall() {
            const message = error && error.message ? error.message : 'custom-eyedropper-flow unavailable';
            return Promise.reject(new Error(message));
          },
        };
      },
      loadError: error,
    };
  }
}

function loadNativeEyeDropperWrapper() {
  try {
    return {
      ...require('./native-eyedropper-wrapper'),
      loadError: null,
    };
  } catch (error) {
    return {
      installNativeEyeDropperWrapper() {
        return {
          ensureWrappedEyeDropperInstalled() {},
        };
      },
      loadError: error,
    };
  }
}

const {
  installEyeDropperRoutingDiagnostics,
  loadError: eyeDropperRoutingLoadError,
} = loadEyeDropperRoutingDiagnostics();
const {
  createCustomEyeDropperFlow,
  loadError: customEyeDropperFlowLoadError,
} = loadCustomEyeDropperFlow();
const {
  installNativeEyeDropperWrapper,
  loadError: nativeEyeDropperWrapperLoadError,
} = loadNativeEyeDropperWrapper();

const { debugEnabled, debugLog, logEyeDropper } = createPreloadDebug({
  spec: process?.env?.CANVA_DEBUG,
  source: 'canva-preload',
});

debugLog('startup', 'preload-loaded', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
logEyeDropper('eyedropper:wrapper', 'preload-loaded', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
if (eyeDropperRoutingLoadError) {
  logEyeDropper(
    'eyedropper:routing',
    'module-load-failed',
    process.isMainFrame ? 'main-frame' : 'sub-frame',
    location.href,
    eyeDropperRoutingLoadError && eyeDropperRoutingLoadError.message
      ? eyeDropperRoutingLoadError.message
      : String(eyeDropperRoutingLoadError)
  );
}
if (customEyeDropperFlowLoadError) {
  logEyeDropper(
    'eyedropper:flow',
    'module-load-failed',
    process.isMainFrame ? 'main-frame' : 'sub-frame',
    location.href,
    customEyeDropperFlowLoadError && customEyeDropperFlowLoadError.message
      ? customEyeDropperFlowLoadError.message
      : String(customEyeDropperFlowLoadError)
  );
}
if (nativeEyeDropperWrapperLoadError) {
  logEyeDropper(
    'eyedropper:wrapper',
    'module-load-failed',
    process.isMainFrame ? 'main-frame' : 'sub-frame',
    location.href,
    nativeEyeDropperWrapperLoadError && nativeEyeDropperWrapperLoadError.message
      ? nativeEyeDropperWrapperLoadError.message
      : String(nativeEyeDropperWrapperLoadError)
  );
}
installUploadDiagnostics({ debugEnabled, debugLog });
const { wrapOpenCall } = createCustomEyeDropperFlow({
  debugLog,
  logEyeDropper,
});
installEyeDropperRoutingDiagnostics({ debugEnabled, debugLog, logEyeDropper, wrapOpenCall });

const { ensureWrappedEyeDropperInstalled } = installNativeEyeDropperWrapper({
  logEyeDropper,
  wrapOpenCall,
});

// Install as early as possible so Canva scripts cannot cache the native
// EyeDropper constructor before the wrapper is in place.
logEyeDropper('eyedropper:wrapper', 'install-trigger', 'preload-eval', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
ensureWrappedEyeDropperInstalled();

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    logEyeDropper('eyedropper:wrapper', 'install-trigger', 'dom-content-loaded', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
    ensureWrappedEyeDropperInstalled();
  }, { once: true });
} else {
  logEyeDropper('eyedropper:wrapper', 'install-trigger', 'document-ready', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  ensureWrappedEyeDropperInstalled();
}

window.addEventListener('pageshow', () => {
  logEyeDropper('eyedropper:wrapper', 'install-trigger', 'pageshow', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  ensureWrappedEyeDropperInstalled();
}, { passive: true });
window.addEventListener('focus', () => {
  logEyeDropper('eyedropper:wrapper', 'install-trigger', 'focus', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  ensureWrappedEyeDropperInstalled();
}, { passive: true });
