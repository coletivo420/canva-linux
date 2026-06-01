import { createPreloadDebug } from "./debug";
import type { EyeDropperCtor, EyeDropperOpenOptions, EyeDropperResult } from "./types";

const { debugEnabled, debugLog, logEyeDropper } = createPreloadDebug({
  source: "canva-preload",
});

debugLog(
  "startup",
  "preload-init",
  process.isMainFrame ? "main-frame" : "sub-frame",
  location.href,
);

type WrapOpenCall = (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;

void (async () => {
  try {
    debugLog("startup", "modules-loaded");

    const wrapOpenCall: WrapOpenCall = await (async () => {
      try {
        const { createCustomEyeDropperFlow } = await import("./custom-eyedropper-flow");
        return createCustomEyeDropperFlow({ debugLog, logEyeDropper }).wrapOpenCall;
      } catch (error) {
        logEyeDropper("eyedropper:flow", "module-load-failed", (error as Error)?.message);
        return () => Promise.reject(new Error("custom-eyedropper-flow unavailable"));
      }
    })();

    const ensureWrappedEyeDropperInstalled = await (async () => {
      try {
        const { installNativeEyeDropperWrapper } = await import("./native-eyedropper-wrapper");
        return installNativeEyeDropperWrapper({ logEyeDropper, wrapOpenCall }).ensureWrappedEyeDropperInstalled;
      } catch (error) {
        logEyeDropper("eyedropper:wrapper", "module-load-failed", (error as Error)?.message);
        return () => false;
      }
    })();

    try {
      const { installUploadDiagnostics } = await import("./upload-diagnostics");
      installUploadDiagnostics({ debugEnabled, debugLog });
    } catch (error) {
      debugLog("startup", "upload-diagnostics-failed", (error as Error)?.message);
    }

    try {
      const { installEyeDropperRoutingDiagnostics: installPrimaryEyeDropperRoutingDiagnostics } =
        await import("./eyedropper-routing-diagnostics");
      installPrimaryEyeDropperRoutingDiagnostics({
        debugEnabled,
        debugLog,
        logEyeDropper,
        wrapOpenCall,
      });
    } catch (primaryError) {
      try {
        const { installEyeDropperRoutingDiagnostics: installFallbackEyeDropperRoutingDiagnostics } =
          await import("./browser-capture-diagnostics");
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
