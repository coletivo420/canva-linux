// @ts-nocheck
"use strict";

const { contextBridge } = require("electron");

const { createPreloadDebug } = require("./debug");

const { debugEnabled, debugLog, logEyeDropper } = createPreloadDebug({
  source: "canva-preload",
});

// CRITICAL: We need this log to know the preload started at all!
debugLog(
  "startup",
  "preload-init",
  process.isMainFrame ? "main-frame" : "sub-frame",
  location.href,
);

function installMainWorldEyeDropperBridge() {
  if (
    !contextBridge ||
    typeof contextBridge.executeInMainWorld !== "function"
  ) {
    return false;
  }

  try {
    contextBridge.executeInMainWorld({
      func: () => {
        const scope = globalThis || window;

        function log(...args) {
          try {
            console.log("[canva:eyedropper:wrapper]", ...args);
          } catch {}
        }

        function bridge() {
          return scope.__canvaEyeDropperBridge;
        }

        function isWrappedEyeDropperInstalled() {
          const ctor = scope.EyeDropper;
          const wrapped = scope.__canvaWrappedEyeDropper;
          return Boolean(
            scope.__canvaWrappedEyeDropperInstalled === true ||
              (typeof wrapped === "function" && ctor === wrapped) ||
              (typeof ctor === "function" && ctor.name === "WrappedEyeDropper"),
          );
        }

        function createAbortError() {
          return new DOMException("The operation was aborted.", "AbortError");
        }

        function createOperationError(message) {
          return new DOMException(
            message || "The wrapper eye dropper failed.",
            "OperationError",
          );
        }

        function installWrappedEyeDropper() {
          if (
            scope.__canvaWrappedEyeDropperInstalled &&
            scope.__canvaWrappedEyeDropper
          ) {
            return scope.__canvaWrappedEyeDropper;
          }

          const existingCtor = (() => {
            try {
              return scope.EyeDropper;
            } catch {
              return undefined;
            }
          })();
          if (
            !scope.__canvaNativeEyeDropper &&
            typeof existingCtor === "function"
          ) {
            scope.__canvaNativeEyeDropper = existingCtor;
          }

          class WrappedEyeDropper {
            async open(options = {}) {
              const api = bridge();
              if (!api || typeof api.open !== "function") {
                throw createOperationError(
                  "The Canva eye dropper bridge is unavailable.",
                );
              }

              const signal = options?.signal;
              if (signal?.aborted) {
                throw createAbortError();
              }

              let abortHandler;
              const pickPromise = Promise.resolve(api.open()).then((result) => {
                if (!result || typeof result.sRGBHex !== "string") {
                  throw createOperationError(
                    "The wrapper eye dropper did not return a valid color.",
                  );
                }
                return { sRGBHex: result.sRGBHex };
              });

              if (!signal) {
                return pickPromise;
              }

              const abortPromise = new Promise((_, reject) => {
                abortHandler = () => {
                  try {
                    api.cancel?.();
                  } catch {}
                  reject(createAbortError());
                };
                signal.addEventListener("abort", abortHandler, { once: true });
              });

              return Promise.race([pickPromise, abortPromise]).finally(() => {
                if (abortHandler) {
                  signal.removeEventListener("abort", abortHandler);
                }
              });
            }
          }

          try {
            Object.defineProperty(scope, "EyeDropper", {
              configurable: true,
              enumerable: false,
              get() {
                return WrappedEyeDropper;
              },
              set() {
                return true;
              },
            });
            scope.__canvaWrappedEyeDropper = WrappedEyeDropper;
            scope.__canvaWrappedEyeDropperInstalled = true;
            log("installed", location.href);
          } catch (error) {
            scope.__canvaWrappedEyeDropperInstalled = false;
            log("install-failed", error?.message || String(error));
          }

          return WrappedEyeDropper;
        }

        function ensureWrappedEyeDropperInstalled() {
          const wrapped = installWrappedEyeDropper();
          try {
            if (scope.EyeDropper !== wrapped) {
              scope.__canvaWrappedEyeDropperInstalled = false;
              installWrappedEyeDropper();
            }
          } catch {}
          return isWrappedEyeDropperInstalled();
        }

        try {
          Object.defineProperty(scope, "ensureWrappedEyeDropperInstalled", {
            configurable: true,
            enumerable: false,
            value: ensureWrappedEyeDropperInstalled,
          });
          Object.defineProperty(scope, "__canvaIsWrappedEyeDropperInstalled", {
            configurable: true,
            enumerable: false,
            value: isWrappedEyeDropperInstalled,
          });
        } catch {}

        ensureWrappedEyeDropperInstalled();
        return true;
      },
    });
    return true;
  } catch (error) {
    logEyeDropper(
      "eyedropper:wrapper",
      "main-world-install-failed",
      error?.message || String(error),
    );
    return false;
  }
}

try {
  function installUploadDiagnostics() {
    try {
      return require("./upload-diagnostics").installUploadDiagnostics;
    } catch {
      return null;
    }
  }

  function loadEyeDropperRoutingDiagnostics() {
    try {
      return require("./eyedropper-routing-diagnostics");
    } catch (primaryError) {
      try {
        return require("./browser-capture-diagnostics");
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
        ...require("./custom-eyedropper-flow"),
        loadError: null,
      };
    } catch (error) {
      return {
        createCustomEyeDropperFlow() {
          return {
            wrapOpenCall() {
              return Promise.reject(
                new Error("custom-eyedropper-flow unavailable"),
              );
            },
            cancelActivePicker() {
              return false;
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
        ...require("./native-eyedropper-wrapper"),
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

  debugLog("startup", "modules-loaded");

  if (eyeDropperRoutingLoadError) {
    logEyeDropper(
      "eyedropper:routing",
      "module-load-failed",
      eyeDropperRoutingLoadError.message,
    );
  }
  if (customEyeDropperFlowLoadError) {
    logEyeDropper(
      "eyedropper:flow",
      "module-load-failed",
      customEyeDropperFlowLoadError.message,
    );
  }
  if (nativeEyeDropperWrapperLoadError) {
    logEyeDropper(
      "eyedropper:wrapper",
      "module-load-failed",
      nativeEyeDropperWrapperLoadError.message,
    );
  }

  const installer = installUploadDiagnostics();
  if (typeof installer === "function") {
    installer({ debugEnabled, debugLog });
  }

  const { wrapOpenCall, cancelActivePicker } = createCustomEyeDropperFlow({
    debugLog,
    logEyeDropper,
  });

  contextBridge.exposeInMainWorld("__canvaEyeDropperBridge", {
    open: () => wrapOpenCall(),
    cancel: () => cancelActivePicker(),
  });
  installEyeDropperRoutingDiagnostics({
    debugEnabled,
    debugLog,
    logEyeDropper,
    wrapOpenCall,
  });

  const { ensureWrappedEyeDropperInstalled } = installNativeEyeDropperWrapper({
    logEyeDropper,
    wrapOpenCall,
  });
  installMainWorldEyeDropperBridge();

  function isWrappedEyeDropperInstalled() {
    try {
      const scope = globalThis || window;
      const ctor = scope.EyeDropper;
      const wrapped = scope.__canvaWrappedEyeDropper;
      const installedFlag = scope.__canvaWrappedEyeDropperInstalled === true;

      return Boolean(
        installedFlag ||
          (typeof wrapped === "function" && ctor === wrapped) ||
          (typeof ctor === "function" && ctor.name === "WrappedEyeDropper"),
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
    Object.defineProperty(globalThis, "ensureWrappedEyeDropperInstalled", {
      configurable: true,
      enumerable: false,
      value: ensureWrappedEyeDropperInstalled,
    });
    Object.defineProperty(globalThis, "__canvaIsWrappedEyeDropperInstalled", {
      configurable: true,
      enumerable: false,
      value: isWrappedEyeDropperInstalled,
    });
  } catch {}

  // Install as early as possible.
  ensureWrappedEyeDropperInstalled();
  installMainWorldEyeDropperBridge();
  debugLog("startup", "eyedropper-installed");

  if (document.readyState === "loading") {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        ensureWrappedEyeDropperInstalled();
        installMainWorldEyeDropperBridge();
      },
      { once: true },
    );
  } else {
    ensureWrappedEyeDropperInstalled();
    installMainWorldEyeDropperBridge();
  }

  window.addEventListener(
    "pageshow",
    () => {
      ensureWrappedEyeDropperInstalled();
      installMainWorldEyeDropperBridge();
    },
    { passive: true },
  );
  window.addEventListener(
    "focus",
    () => {
      ensureWrappedEyeDropperInstalled();
      installMainWorldEyeDropperBridge();
    },
    { passive: true },
  );
} catch (fatalError) {
  console.error("[canva:canva-preload:fatal]", fatalError);
  if (typeof debugLog === "function") {
    debugLog("startup", "fatal-error", fatalError.message);
  }
}
