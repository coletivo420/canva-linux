import { createPreloadDebug } from "./debug.js";
import type { EyeDropperCtor, EyeDropperOpenOptions, EyeDropperResult } from "./types.js";
import { createCustomEyeDropperFlow } from "./custom-eyedropper-flow.js";
import { installNativeEyeDropperWrapper } from "./native-eyedropper-wrapper.js";
import { installUploadDiagnostics } from "./upload-diagnostics.js";
import { installEyeDropperRoutingDiagnostics as installPrimaryEyeDropperRoutingDiagnostics } from "./eyedropper-routing-diagnostics.js";
import { installEyeDropperRoutingDiagnostics as installFallbackEyeDropperRoutingDiagnostics } from "./browser-capture-diagnostics.js";
import { describePreloadFrame } from "./electron-preload-api.js";

const { debugEnabled, debugLog, logEyeDropper } = createPreloadDebug({
  source: "canva-preload",
});

debugLog(
  "startup",
  "preload-init",
  describePreloadFrame(),
  location.href,
);

type WrapOpenCall = (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;

void (async () => {
  try {
    debugLog("startup", "modules-loaded");

    const wrapOpenCall: WrapOpenCall = createCustomEyeDropperFlow({
      debugLog,
      logEyeDropper,
    }).wrapOpenCall;

    const { ensureWrappedEyeDropperInstalled } = installNativeEyeDropperWrapper({
      logEyeDropper,
      wrapOpenCall,
    });

    try {
      installUploadDiagnostics({ debugEnabled, debugLog });
    } catch (error) {
      debugLog("startup", "upload-diagnostics-failed", (error as Error)?.message);
    }

    try {
      installPrimaryEyeDropperRoutingDiagnostics({
        debugEnabled,
        debugLog,
        logEyeDropper,
        wrapOpenCall,
      });
    } catch (primaryError) {
      try {
        installFallbackEyeDropperRoutingDiagnostics({
          debugEnabled,
          debugLog,
          logEyeDropper,
          wrapOpenCall,
        });
      } catch (fallbackError) {
        logEyeDropper(
          "eyedropper:routing",
          "module-load-failed",
          (fallbackError as Error)?.message || (primaryError as Error)?.message,
        );
      }
    }

    function isWrappedEyeDropperInstalled(): boolean {
      try {
        const scope = globalThis as typeof globalThis & {
          EyeDropper?: EyeDropperCtor;
          __canvaWrappedEyeDropper?: EyeDropperCtor;
          __canvaWrappedEyeDropperInstalled?: boolean;
        };
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

    ensureWrappedEyeDropperInstalled();
    debugLog("startup", "eyedropper-installed");

    if (document.readyState === "loading") {
      window.addEventListener(
        "DOMContentLoaded",
        () => {
          ensureWrappedEyeDropperInstalled();
        },
        { once: true },
      );
    } else {
      ensureWrappedEyeDropperInstalled();
    }

    window.addEventListener(
      "pageshow",
      () => {
        ensureWrappedEyeDropperInstalled();
      },
      { passive: true },
    );
    window.addEventListener(
      "focus",
      () => {
        ensureWrappedEyeDropperInstalled();
      },
      { passive: true },
    );
  } catch (fatalError) {
    console.error("[canva:canva-preload:fatal]", fatalError);
    if (typeof debugLog === "function") {
      debugLog("startup", "fatal-error", (fatalError as Error)?.message);
    }
  }
})();
