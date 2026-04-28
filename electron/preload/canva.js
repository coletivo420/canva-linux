// @ts-nocheck
'use strict';

console.log('[canva:preload] raw-init ' + location.href);

const { createPreloadDebug } = require('./debug');

const { debugEnabled, debugLog, logEyeDropper } = createPreloadDebug({
  source: 'canva-preload',
});

// CRITICAL: We need this log to know the preload started at all!
debugLog('startup', 'preload-init', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);

try {
  function installUploadDiagnostics() {
    try {
      return require('./upload-diagnostics').installUploadDiagnostics;
    } catch {
      return null;
    }
  }

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
              return Promise.reject(new Error('custom-eyedropper-flow unavailable'));
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

  debugLog('startup', 'modules-loaded');

  if (eyeDropperRoutingLoadError) {
    logEyeDropper('eyedropper:routing', 'module-load-failed', eyeDropperRoutingLoadError.message);
  }
  if (customEyeDropperFlowLoadError) {
    logEyeDropper('eyedropper:flow', 'module-load-failed', customEyeDropperFlowLoadError.message);
  }
  if (nativeEyeDropperWrapperLoadError) {
    logEyeDropper('eyedropper:wrapper', 'module-load-failed', nativeEyeDropperWrapperLoadError.message);
  }

  const installer = installUploadDiagnostics();
  if (typeof installer === 'function') {
    installer({ debugEnabled, debugLog });
  }

  const { wrapOpenCall } = createCustomEyeDropperFlow({
    debugLog,
    logEyeDropper,
  });
  installEyeDropperRoutingDiagnostics({ debugEnabled, debugLog, logEyeDropper, wrapOpenCall });

  const { ensureWrappedEyeDropperInstalled } = installNativeEyeDropperWrapper({
    logEyeDropper,
    wrapOpenCall,
  });

  function isWrappedEyeDropperInstalled() {
    try {
      const scope = globalThis || window;
      const ctor = scope.EyeDropper;
      const wrapped = scope.__canvaWrappedEyeDropper;
      const installedFlag = scope.__canvaWrappedEyeDropperInstalled === true;

      return Boolean(
        installedFlag
        || (typeof wrapped === 'function' && ctor === wrapped)
        || (typeof ctor === 'function' && ctor.name === 'WrappedEyeDropper')
      );
    } catch {
      return false;
    }
  }

  // tab-events.js runs diagnostics through executeJavaScript() after complex
  // Canva editor navigations. Expose only idempotent helpers so the main
  // process can verify/reinstall the wrapper without depending on preload
  // module scope.
  try {
    Object.defineProperty(globalThis, 'ensureWrappedEyeDropperInstalled', {
      configurable: true,
      enumerable: false,
      value: ensureWrappedEyeDropperInstalled,
    });
    Object.defineProperty(globalThis, '__canvaIsWrappedEyeDropperInstalled', {
      configurable: true,
      enumerable: false,
      value: isWrappedEyeDropperInstalled,
    });
  } catch {}

  // Install as early as possible.
  ensureWrappedEyeDropperInstalled();
  debugLog('startup', 'eyedropper-installed');

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      ensureWrappedEyeDropperInstalled();
    }, { once: true });
  } else {
    ensureWrappedEyeDropperInstalled();
  }

  window.addEventListener('pageshow', () => {
    ensureWrappedEyeDropperInstalled();
  }, { passive: true });
  window.addEventListener('focus', () => {
    ensureWrappedEyeDropperInstalled();
  }, { passive: true });

} catch (fatalError) {
  console.error('[canva:canva-preload:fatal]', fatalError);
  if (typeof debugLog === 'function') {
    debugLog('startup', 'fatal-error', fatalError.message);
  }
}
