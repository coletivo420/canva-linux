// @ts-nocheck
'use strict';

// @ts-check

/**
 * @typedef {(...args: unknown[]) => void} EyeDropperLog
 * @typedef {(options?: EyeDropperOpenOptions) => Promise<{ sRGBHex: string }>} WrapOpenCall
 * @typedef {{ signal?: AbortSignal }} EyeDropperOpenOptions
 * @typedef {{ logEyeDropper: EyeDropperLog, wrapOpenCall: WrapOpenCall }} NativeEyeDropperWrapperOptions
 * @typedef {{ __canvaWrappedEyeDropperInstalled?: boolean, __canvaWrappedEyeDropper?: Function, __canvaNativeEyeDropper?: Function, __canvaEyeDropperState?: { readCount: number, setCount: number }, EyeDropper?: Function }} CanvaEyeDropperScope
 */

/**
 * @param {CanvaEyeDropperScope} scope
 * @returns {boolean}
 */
function isWrappedEyeDropperInstalledInScope(scope) {
  return Boolean(
    scope.__canvaWrappedEyeDropperInstalled
    || (
      typeof scope.__canvaWrappedEyeDropper === 'function'
      && scope.EyeDropper === scope.__canvaWrappedEyeDropper
    )
    || (
      typeof scope.EyeDropper === 'function'
      && scope.EyeDropper.name === 'WrappedEyeDropper'
    )
  );
}

/**
 * @returns {CanvaEyeDropperScope}
 */
function getCanvaEyeDropperScope() {
  return /** @type {CanvaEyeDropperScope} */ (globalThis);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : String(error);
}

// Own the replacement of Canva's native EyeDropper API separately from the
// CL-EyeDropper flow so the preload entrypoint stays thin while preserving the
// project policy that Canva color picking must flow through the custom picker.
/**
 * @param {NativeEyeDropperWrapperOptions} options
 * @returns {{ ensureWrappedEyeDropperInstalled: () => boolean }}
 */
function installNativeEyeDropperWrapper({
  logEyeDropper,
  wrapOpenCall,
}) {
  /**
   * @param {CanvaEyeDropperScope | null | undefined} scope
   * @returns {boolean}
   */
  function patchNativeEyeDropperPrototype(scope) {
    if (!scope) return false;
    const nativeCtor = scope.__canvaNativeEyeDropper || scope.EyeDropper;
    if (typeof nativeCtor !== 'function') return false;
    const proto = /** @type {Record<string, unknown>} */ (nativeCtor.prototype);
    if (!proto || typeof proto.open !== 'function') return false;
    if (proto.__canvaNativeOpenPatched) return true;

    const originalOpen = /** @type {Function} */ (proto.open);
    Object.defineProperty(proto, '__canvaOriginalOpen', {
      configurable: true,
      enumerable: false,
      value: originalOpen,
      writable: false,
    });

    Object.defineProperty(proto, 'open', {
      configurable: true,
      enumerable: false,
      writable: true,
      /**
       * @param {EyeDropperOpenOptions} [options]
       */
      value: function patchedNativeOpen(options = {}) {
        logEyeDropper('eyedropper:wrapper', 'native open intercepted', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
        return wrapOpenCall(options);
      },
    });

    Object.defineProperty(proto, '__canvaNativeOpenPatched', {
      configurable: true,
      enumerable: false,
      value: true,
      writable: false,
    });

    logEyeDropper('eyedropper:wrapper', 'patched native prototype', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, nativeCtor.name || 'EyeDropper');
    return true;
  }

  /**
   * @returns {Function}
   */
  function installWrappedEyeDropper() {
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
    if (!scope.__canvaNativeEyeDropper && typeof existingCtor === 'function') {
      scope.__canvaNativeEyeDropper = existingCtor;
    }

    const state = scope.__canvaEyeDropperState || {
      readCount: 0,
      setCount: 0,
    };
    scope.__canvaEyeDropperState = state;

    class WrappedEyeDropper {
      constructor() {
        logEyeDropper('eyedropper:wrapper', 'new EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
      }

      async open(options = {}) {
        logEyeDropper('eyedropper:wrapper', 'wrapper open-request', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
        return wrapOpenCall(options);
      }
    }

    /** @type {Array<[CanvaEyeDropperScope, string]>} */
    const targets = [];
    const seen = new Set();
    /**
     * @param {unknown} target
     * @param {string} label
     */
    const addTarget = (target, label) => {
      if (!target || seen.has(target)) return;
      seen.add(target);
      targets.push([/** @type {CanvaEyeDropperScope} */ (target), label]);
    };
    addTarget(window, 'window');
    try { addTarget(globalThis, 'globalThis'); } catch {}
    try { if (typeof self !== 'undefined') addTarget(self, 'self'); } catch {}

    const descriptor = {
      configurable: true,
      enumerable: false,
      get() {
        state.readCount += 1;
        if (state.readCount <= 8) {
          logEyeDropper('eyedropper:wrapper', 'get EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, `count=${state.readCount}`);
        }
        return WrappedEyeDropper;
      },
      /** @param {unknown} value */
      set(value) {
        state.setCount += 1;
        if (state.setCount <= 8) {
          const valueName = value && typeof value === 'function' && value.name ? value.name : typeof value;
          logEyeDropper('eyedropper:wrapper', 'set EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, `count=${state.setCount}`, valueName);
        }
        return true;
      },
    };

    let installedAny = false;
    for (const [target, label] of targets) {
      try {
        Object.defineProperty(target, 'EyeDropper', descriptor);
        installedAny = true;
      } catch (error) {
        logEyeDropper('eyedropper:wrapper', 'install-failed', label, process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, errorMessage(error));
      }
    }

    patchNativeEyeDropperPrototype(scope);

    scope.__canvaWrappedEyeDropper = WrappedEyeDropper;
    scope.__canvaWrappedEyeDropperInstalled = installedAny;
    if (installedAny) {
      logEyeDropper('eyedropper:wrapper', 'installed', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
    }
    return WrappedEyeDropper;
  }

  /**
   * @returns {boolean}
   */
  function ensureWrappedEyeDropperInstalled() {
    const scope = getCanvaEyeDropperScope();
    const wrapped = installWrappedEyeDropper();
    try {
      patchNativeEyeDropperPrototype(scope);
      if (scope.EyeDropper !== wrapped) {
        logEyeDropper('eyedropper:wrapper', 'reinstall EyeDropper', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
        scope.__canvaWrappedEyeDropperInstalled = false;
        installWrappedEyeDropper();
      }
    } catch (error) {
      logEyeDropper('eyedropper:wrapper', 'ensure-failed', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href, errorMessage(error));
    }

    return isWrappedEyeDropperInstalledInScope(scope);
  }

  return {
    ensureWrappedEyeDropperInstalled,
  };
}

module.exports = {
  installNativeEyeDropperWrapper,
  isWrappedEyeDropperInstalledInScope,
};
