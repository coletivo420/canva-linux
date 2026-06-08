import type { EyeDropperCtor, EyeDropperLog, EyeDropperOpenOptions, EyeDropperResult } from "./types.js";

type WrapOpenCall = (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;

type CanvaEyeDropperScope = typeof globalThis & {
  __canvaWrappedEyeDropperInstalled?: boolean;
  __canvaWrappedEyeDropper?: EyeDropperCtor;
  __canvaNativeEyeDropper?: EyeDropperCtor;
  __canvaEyeDropperState?: {
    readCount: number;
    setCount: number;
  };
  EyeDropper?: EyeDropperCtor;
};

function getCanvaEyeDropperScope(): CanvaEyeDropperScope {
  return globalThis as CanvaEyeDropperScope;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

export function isWrappedEyeDropperInstalledInScope(scope: CanvaEyeDropperScope): boolean {
  return Boolean(
    scope.__canvaWrappedEyeDropperInstalled ||
      (typeof scope.__canvaWrappedEyeDropper === "function" &&
        scope.EyeDropper === scope.__canvaWrappedEyeDropper) ||
      (typeof scope.EyeDropper === "function" && scope.EyeDropper.name === "WrappedEyeDropper"),
  );
}

export function installNativeEyeDropperWrapper({
  logEyeDropper,
  wrapOpenCall,
}: {
  logEyeDropper: EyeDropperLog;
  wrapOpenCall: WrapOpenCall;
}): { ensureWrappedEyeDropperInstalled: () => boolean } {
  function patchNativeEyeDropperPrototype(scope: CanvaEyeDropperScope | null | undefined): boolean {
    if (!scope) return false;
    const nativeCtor = scope.__canvaNativeEyeDropper || scope.EyeDropper;
    if (typeof nativeCtor !== "function") return false;
    const proto = nativeCtor.prototype as Record<string, unknown> | undefined;
    if (!proto || typeof proto.open !== "function") return false;
    if (proto.__canvaNativeOpenPatched) return true;

    const originalOpen = proto.open as Function;
    Object.defineProperty(proto, "__canvaOriginalOpen", {
      configurable: true,
      enumerable: false,
      value: originalOpen,
      writable: false,
    });

    Object.defineProperty(proto, "open", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function patchedNativeOpen(options: EyeDropperOpenOptions = {}) {
        logEyeDropper(
          "eyedropper:wrapper",
          "native open intercepted",
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
        );
        return wrapOpenCall(options);
      },
    });

    Object.defineProperty(proto, "__canvaNativeOpenPatched", {
      configurable: true,
      enumerable: false,
      value: true,
      writable: false,
    });

    logEyeDropper(
      "eyedropper:wrapper",
      "patched native prototype",
      process.isMainFrame ? "main-frame" : "sub-frame",
      location.href,
      nativeCtor.name || "EyeDropper",
    );
    return true;
  }

  function installWrappedEyeDropper(): EyeDropperCtor {
    const scope = getCanvaEyeDropperScope();
    if (scope.__canvaWrappedEyeDropperInstalled && scope.__canvaWrappedEyeDropper) {
      patchNativeEyeDropperPrototype(scope);
      return scope.__canvaWrappedEyeDropper;
    }

    const existingCtor = (() => {
      try {
        return scope.EyeDropper;
      } catch {
        return undefined;
      }
    })();

    if (!scope.__canvaNativeEyeDropper && typeof existingCtor === "function") {
      scope.__canvaNativeEyeDropper = existingCtor;
    }

    const state = scope.__canvaEyeDropperState || { readCount: 0, setCount: 0 };
    scope.__canvaEyeDropperState = state;

    class WrappedEyeDropper {
      constructor() {
        logEyeDropper(
          "eyedropper:wrapper",
          "new EyeDropper",
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
        );
      }

      async open(options: EyeDropperOpenOptions = {}): Promise<EyeDropperResult> {
        logEyeDropper(
          "eyedropper:wrapper",
          "wrapper open-request",
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
        );
        return wrapOpenCall(options);
      }
    }

    const targets: Array<[CanvaEyeDropperScope, string]> = [];
    const seen = new Set<object>();
    const addTarget = (target: unknown, label: string): void => {
      if (!target || typeof target !== "object" || seen.has(target)) return;
      seen.add(target);
      targets.push([target as CanvaEyeDropperScope, label]);
    };

    addTarget(window, "window");
    try {
      addTarget(globalThis, "globalThis");
    } catch {}
    try {
      if (typeof self !== "undefined") addTarget(self, "self");
    } catch {}

    const descriptor: PropertyDescriptor = {
      configurable: true,
      enumerable: false,
      get() {
        state.readCount += 1;
        if (state.readCount <= 8) {
          logEyeDropper(
            "eyedropper:wrapper",
            "get EyeDropper",
            process.isMainFrame ? "main-frame" : "sub-frame",
            location.href,
            `count=${state.readCount}`,
          );
        }
        return WrappedEyeDropper as unknown as EyeDropperCtor;
      },
      set(value: unknown) {
        state.setCount += 1;
        if (state.setCount <= 8) {
          const valueName = value && typeof value === "function" && value.name ? value.name : typeof value;
          logEyeDropper(
            "eyedropper:wrapper",
            "set EyeDropper",
            process.isMainFrame ? "main-frame" : "sub-frame",
            location.href,
            `count=${state.setCount}`,
            valueName,
          );
        }
        return true;
      },
    };

    let installedAny = false;
    for (const [target, label] of targets) {
      try {
        Object.defineProperty(target, "EyeDropper", descriptor);
        installedAny = true;
      } catch (error) {
        logEyeDropper(
          "eyedropper:wrapper",
          "install-failed",
          label,
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
          errorMessage(error),
        );
      }
    }

    patchNativeEyeDropperPrototype(scope);

    scope.__canvaWrappedEyeDropper = WrappedEyeDropper as unknown as EyeDropperCtor;
    scope.__canvaWrappedEyeDropperInstalled = installedAny;
    if (installedAny) {
      logEyeDropper(
        "eyedropper:wrapper",
        "installed",
        process.isMainFrame ? "main-frame" : "sub-frame",
        location.href,
      );
    }

    return WrappedEyeDropper as unknown as EyeDropperCtor;
  }

  function ensureWrappedEyeDropperInstalled(): boolean {
    const scope = getCanvaEyeDropperScope();
    const wrapped = installWrappedEyeDropper();
    try {
      patchNativeEyeDropperPrototype(scope);
      if (scope.EyeDropper !== wrapped) {
        logEyeDropper(
          "eyedropper:wrapper",
          "reinstall EyeDropper",
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
        );
        scope.__canvaWrappedEyeDropperInstalled = false;
        installWrappedEyeDropper();
      }
    } catch (error) {
      logEyeDropper(
        "eyedropper:wrapper",
        "ensure-failed",
        process.isMainFrame ? "main-frame" : "sub-frame",
        location.href,
        errorMessage(error),
      );
    }

    return isWrappedEyeDropperInstalledInScope(scope);
  }

  return { ensureWrappedEyeDropperInstalled };
}
