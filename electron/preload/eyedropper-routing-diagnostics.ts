// @ts-nocheck
"use strict";

// @ts-check

// Keep eyedropper routing diagnostics isolated here. These hooks exist only to
// trace and redirect Canva-facing browser/native picker entrypoints back into
// CL-EyeDropper; they must not become an alternative colorpicker implementation.

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 * @typedef {(...args: unknown[]) => void} EyeDropperLog
 * @typedef {(options?: EyeDropperOpenOptions) => Promise<{ sRGBHex?: string, hex?: string }>} WrapOpenCall
 * @typedef {{ debugEnabled: (category?: string) => boolean, debugLog: DebugLog, logEyeDropper: EyeDropperLog, wrapOpenCall?: WrapOpenCall }} EyeDropperRoutingOptions
 * @typedef {{ signal?: AbortSignal }} EyeDropperOpenOptions
 * @typedef {{ getTracks?: () => Array<{ kind?: string, readyState?: string, label?: string }> }} MediaStreamLike
 * @typedef {{ tagName?: unknown, id?: unknown, className?: unknown }} ElementLike
 * @typedef {HTMLInputElement & { __canvaCustomColorInputPending?: boolean }} PendingColorInput
 * @typedef {{ __canvaEyeDropperRoutingDiagnosticsInstalled?: boolean, __canvaLastCaptureActivation?: { event?: string, timestamp?: number, target?: string, active?: string, trusted?: string }, MediaDevices?: { prototype?: Record<string, unknown> }, HTMLInputElement?: { prototype?: Record<string, unknown> }, navigator?: Navigator }} EyeDropperRoutingScope
 */

/**
 * @param {EyeDropperRoutingOptions} options
 * @returns {void}
 */
function installEyeDropperRoutingDiagnostics({
  debugEnabled,
  debugLog,
  logEyeDropper,
  wrapOpenCall,
}) {
  const debugActive =
    debugEnabled("eyedropper") || debugEnabled("eyedropper:routing");
  const interceptActive = typeof wrapOpenCall === "function";
  if (!debugActive && !interceptActive) {
    return;
  }

  const scope = getEyeDropperRoutingScope();
  if (scope.__canvaEyeDropperRoutingDiagnosticsInstalled) {
    return;
  }
  scope.__canvaEyeDropperRoutingDiagnosticsInstalled = true;

  installRecentActivationTrace({ debugLog, logEyeDropper, debugActive });
  installMediaDevicesDiagnostics({
    scope,
    debugLog,
    logEyeDropper,
    debugActive,
  });
  installLegacyGetUserMediaDiagnostics({
    scope,
    debugLog,
    logEyeDropper,
    debugActive,
  });
  installColorInputInterception({
    scope,
    debugLog,
    logEyeDropper,
    wrapOpenCall,
    debugActive,
  });
}

/**
 * @returns {EyeDropperRoutingScope}
 */
function getEyeDropperRoutingScope() {
  return /** @type {EyeDropperRoutingScope} */ /** @type {unknown} */ globalThis;
}

/**
 * @param {{ debugLog: DebugLog, logEyeDropper: EyeDropperLog, debugActive: boolean }} options
 * @returns {void}
 */
function installRecentActivationTrace({
  debugLog,
  logEyeDropper,
  debugActive,
}) {
  const scope = getEyeDropperRoutingScope();
  /**
   * @param {string} eventName
   * @param {MouseEvent | KeyboardEvent | PointerEvent} event
   */
  const update = (eventName, event) => {
    const summary = {
      event: eventName,
      timestamp: Date.now(),
      trusted: event?.isTrusted ? "true" : "false",
      target: describeTarget(event?.target),
      button: Number.isFinite(/** @type {{ button?: unknown }} */ event.button)
        ? /** @type {{ button: number }} */ event.button
        : "na",
      buttons: Number.isFinite(
        /** @type {{ buttons?: unknown }} */ event.buttons,
      )
        ? /** @type {{ buttons: number }} */ event.buttons
        : "na",
      detail: Number.isFinite(event?.detail) ? event.detail : "na",
      active: describeTarget(document.activeElement),
    };
    scope.__canvaLastCaptureActivation = summary;
    if (!debugActive) return;
    debugLog(
      "eyedropper:routing",
      "activation",
      summary.event,
      `trusted=${summary.trusted}`,
      `target=${summary.target}`,
      `button=${summary.button}`,
      `buttons=${summary.buttons}`,
      `detail=${summary.detail}`,
      `active=${summary.active}`,
    );
  };

  window.addEventListener(
    "pointerdown",
    (event) => update("pointerdown", event),
    true,
  );
  window.addEventListener(
    "mousedown",
    (event) => update("mousedown", event),
    true,
  );
  window.addEventListener("click", (event) => update("click", event), true);
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        update(`keydown:${event.key}`, event);
      }
    },
    true,
  );

  if (debugActive) {
    logEyeDropper(
      "eyedropper:routing",
      "activation-trace-installed",
      process.isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
}

/**
 * @param {{ scope: EyeDropperRoutingScope, debugLog: DebugLog, logEyeDropper: EyeDropperLog, debugActive: boolean }} options
 * @returns {void}
 */
function installMediaDevicesDiagnostics({
  scope,
  debugLog,
  logEyeDropper,
  debugActive,
}) {
  const mediaDevices = scope?.navigator?.mediaDevices;
  const proto = scope?.MediaDevices?.prototype;

  const wrappedDisplayInstance = wrapMethod({
    target:
      /** @type {Record<string, unknown> | null | undefined} */ /** @type {unknown} */ mediaDevices,
    methodName: "getDisplayMedia",
    debugLog,
    logEyeDropper,
    debugActive,
    label: "navigator.mediaDevices",
  });
  const wrappedDisplayProto = wrapMethod({
    target: proto,
    methodName: "getDisplayMedia",
    debugLog,
    logEyeDropper,
    debugActive,
    label: "MediaDevices.prototype",
  });
  const wrappedUserInstance = wrapMethod({
    target:
      /** @type {Record<string, unknown> | null | undefined} */ /** @type {unknown} */ mediaDevices,
    methodName: "getUserMedia",
    debugLog,
    logEyeDropper,
    debugActive,
    label: "navigator.mediaDevices",
  });
  const wrappedUserProto = wrapMethod({
    target: proto,
    methodName: "getUserMedia",
    debugLog,
    logEyeDropper,
    debugActive,
    label: "MediaDevices.prototype",
  });

  if (debugActive && !wrappedDisplayInstance && !wrappedDisplayProto) {
    logEyeDropper(
      "eyedropper:routing",
      "getDisplayMedia-unavailable",
      process.isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
  if (debugActive && !wrappedUserInstance && !wrappedUserProto) {
    logEyeDropper(
      "eyedropper:routing",
      "getUserMedia-unavailable",
      process.isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
}

/**
 * @param {{ scope: EyeDropperRoutingScope, debugLog: DebugLog, logEyeDropper: EyeDropperLog, debugActive: boolean }} options
 * @returns {void}
 */
function installLegacyGetUserMediaDiagnostics({
  scope,
  debugLog,
  logEyeDropper,
  debugActive,
}) {
  wrapLegacyNavigatorMethod({
    scope,
    methodName: "getUserMedia",
    debugLog,
    logEyeDropper,
    debugActive,
  });
  wrapLegacyNavigatorMethod({
    scope,
    methodName: "webkitGetUserMedia",
    debugLog,
    logEyeDropper,
    debugActive,
  });
  wrapLegacyNavigatorMethod({
    scope,
    methodName: "mozGetUserMedia",
    debugLog,
    logEyeDropper,
    debugActive,
  });
}

/**
 * @param {{ target: Record<string, unknown> | null | undefined, methodName: string, debugLog: DebugLog, logEyeDropper: EyeDropperLog, debugActive: boolean, label: string }} options
 * @returns {boolean}
 */
function wrapMethod({
  target,
  methodName,
  debugLog,
  logEyeDropper,
  debugActive,
  label,
}) {
  if (!target || typeof target[methodName] !== "function") {
    return false;
  }
  const original =
    /** @type {((...args: unknown[]) => unknown) & { __canvaDebugWrapped?: boolean }} */ target[
      methodName
    ];
  if (original.__canvaDebugWrapped) {
    return true;
  }

  const wrapped =
    /** @type {((this: unknown, ...args: unknown[]) => unknown) & { __canvaDebugWrapped?: boolean }} */ function wrappedMediaMethod(
      ...args
    ) {
      const activation = lastActivationSummary();
      const serializedArgs =
        args.length > 0 ? serializeValue(args[0]) : "args=none";
      if (debugActive) {
        debugLog(
          "eyedropper:routing",
          `${methodName}-call`,
          label,
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
          serializedArgs,
          activation,
        );
        logEyeDropper(
          "eyedropper:routing",
          `${methodName}-call`,
          label,
          process.isMainFrame ? "main-frame" : "sub-frame",
          location.href,
          serializedArgs,
          activation,
        );
      }

      let result;
      try {
        result = original.apply(this, args);
      } catch (error) {
        const message = errorMessage(error);
        if (debugActive) {
          debugLog(
            "eyedropper:routing",
            `${methodName}-throw`,
            label,
            errorName(error),
            message,
          );
          logEyeDropper(
            "eyedropper:routing",
            `${methodName}-throw`,
            label,
            errorName(error),
            message,
          );
        }
        throw error;
      }

      if (!isPromiseLike(result)) {
        if (debugActive) {
          debugLog(
            "eyedropper:routing",
            `${methodName}-return`,
            label,
            typeof result,
          );
          logEyeDropper(
            "eyedropper:routing",
            `${methodName}-return`,
            label,
            typeof result,
          );
        }
        return result;
      }

      return Promise.resolve(result)
        .then((stream) => {
          const trackSummary = summarizeStream(
            /** @type {MediaStreamLike | null | undefined} */ stream,
          );
          if (debugActive) {
            debugLog(
              "eyedropper:routing",
              `${methodName}-resolved`,
              label,
              trackSummary,
            );
            logEyeDropper(
              "eyedropper:routing",
              `${methodName}-resolved`,
              label,
              trackSummary,
            );
          }
          return stream;
        })
        .catch((error) => {
          const message = errorMessage(error);
          if (debugActive) {
            debugLog(
              "eyedropper:routing",
              `${methodName}-rejected`,
              label,
              errorName(error),
              message,
            );
            logEyeDropper(
              "eyedropper:routing",
              `${methodName}-rejected`,
              label,
              errorName(error),
              message,
            );
          }
          throw error;
        });
    };

  wrapped.__canvaDebugWrapped = true;
  Object.defineProperty(wrapped, "name", {
    configurable: true,
    value: original.name || methodName,
  });

  try {
    Object.defineProperty(target, methodName, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: wrapped,
    });
  } catch {
    target[methodName] = wrapped;
  }

  if (debugActive) {
    logEyeDropper(
      "eyedropper:routing",
      `${methodName}-wrapped`,
      label,
      process.isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
  return true;
}

/**
 * @param {{ scope: EyeDropperRoutingScope, methodName: string, debugLog: DebugLog, logEyeDropper: EyeDropperLog, debugActive: boolean }} options
 * @returns {void}
 */
function wrapLegacyNavigatorMethod({
  scope,
  methodName,
  debugLog,
  logEyeDropper,
  debugActive,
}) {
  const navigatorObject = scope?.navigator;
  const navigatorRecord =
    /** @type {Record<string, unknown> | null | undefined} */ /** @type {unknown} */ navigatorObject;
  if (!navigatorRecord || typeof navigatorRecord[methodName] !== "function") {
    return;
  }
  const original =
    /** @type {((...args: unknown[]) => unknown) & { __canvaDebugWrapped?: boolean }} */ navigatorRecord[
      methodName
    ];
  if (original.__canvaDebugWrapped) {
    return;
  }

  const wrapped =
    /** @type {((this: unknown, ...args: unknown[]) => unknown) & { __canvaDebugWrapped?: boolean }} */ function wrappedLegacyGetUserMedia(
      ...args
    ) {
      const serializedArgs =
        args.length > 0 ? serializeValue(args[0]) : "args=none";
      const activation = lastActivationSummary();
      if (debugActive) {
        debugLog(
          "eyedropper:routing",
          `${methodName}-call`,
          "navigator",
          serializedArgs,
          activation,
        );
        logEyeDropper(
          "eyedropper:routing",
          `${methodName}-call`,
          "navigator",
          serializedArgs,
          activation,
        );
      }
      return original.apply(this, args);
    };

  wrapped.__canvaDebugWrapped = true;
  navigatorRecord[methodName] = wrapped;
  if (debugActive) {
    logEyeDropper(
      "eyedropper:routing",
      `${methodName}-wrapped`,
      "navigator",
      process.isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
}

/**
 * @param {{ scope: EyeDropperRoutingScope, debugLog: DebugLog, logEyeDropper: EyeDropperLog, wrapOpenCall?: WrapOpenCall, debugActive: boolean }} options
 * @returns {void}
 */
function installColorInputInterception({
  scope,
  debugLog,
  logEyeDropper,
  wrapOpenCall,
  debugActive,
}) {
  if (typeof wrapOpenCall !== "function") return;

  const inputProto = scope?.HTMLInputElement?.prototype;
  if (!inputProto) return;

  wrapColorInputMethod({
    prototype: inputProto,
    methodName: "showPicker",
    debugLog,
    logEyeDropper,
    wrapOpenCall,
    debugActive,
  });
  wrapColorInputMethod({
    prototype: inputProto,
    methodName: "click",
    debugLog,
    logEyeDropper,
    wrapOpenCall,
    debugActive,
  });

  window.addEventListener(
    "click",
    (event) => {
      const input =
        event.target instanceof HTMLInputElement ? event.target : null;
      if (!isColorInput(input)) return;
      if (debugActive) {
        debugLog(
          "eyedropper:wrapper",
          "color-input-dom-click",
          describeColorInput(input),
          lastActivationSummary(),
        );
      }
      event.preventDefault();
      openCustomColorInput({
        input,
        wrapOpenCall,
        debugLog,
        logEyeDropper,
        trigger: "dom-click",
        debugActive,
      });
    },
    true,
  );
}

/**
 * @param {{ prototype: Record<string, unknown>, methodName: string, debugLog: DebugLog, logEyeDropper: EyeDropperLog, wrapOpenCall: WrapOpenCall, debugActive: boolean }} options
 * @returns {void}
 */
function wrapColorInputMethod({
  prototype,
  methodName,
  debugLog,
  logEyeDropper,
  wrapOpenCall,
  debugActive,
}) {
  if (typeof prototype[methodName] !== "function") return;
  const original =
    /** @type {((...args: unknown[]) => unknown) & Record<string, unknown>} */ prototype[
      methodName
    ];
  const marker = `__canvaColorInput${methodName}Wrapped`;
  if (original[marker]) return;

  const wrapped =
    /** @type {((this: HTMLInputElement, ...args: unknown[]) => unknown) & Record<string, unknown>} */ function wrappedColorInputMethod(
      ...args
    ) {
      if (!isColorInput(this)) {
        return original.apply(this, args);
      }
      if (debugActive) {
        debugLog(
          "eyedropper:wrapper",
          `color-input-${methodName}`,
          describeColorInput(this),
          lastActivationSummary(),
        );
        logEyeDropper(
          "eyedropper:wrapper",
          `color-input-${methodName}`,
          describeColorInput(this),
          lastActivationSummary(),
        );
      }
      if (methodName === "click") {
        // Avoid letting Chromium open the native color picker for direct input.click().
        openCustomColorInput({
          input: this,
          wrapOpenCall,
          debugLog,
          logEyeDropper,
          trigger: "input.click",
          debugActive,
        });
        return;
      }
      openCustomColorInput({
        input: this,
        wrapOpenCall,
        debugLog,
        logEyeDropper,
        trigger: "showPicker",
        debugActive,
      });
      return undefined;
    };

  wrapped[marker] = true;
  try {
    Object.defineProperty(prototype, methodName, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: wrapped,
    });
  } catch {
    prototype[methodName] = wrapped;
  }
}

/**
 * @param {{ input: HTMLInputElement, wrapOpenCall: WrapOpenCall, debugLog: DebugLog, logEyeDropper: EyeDropperLog, trigger: string, debugActive: boolean }} options
 * @returns {void}
 */
function openCustomColorInput({
  input,
  wrapOpenCall,
  debugLog,
  logEyeDropper,
  trigger,
  debugActive,
}) {
  const pendingInput = /** @type {PendingColorInput} */ input;
  if (!isColorInput(input) || pendingInput.__canvaCustomColorInputPending)
    return;
  pendingInput.__canvaCustomColorInputPending = true;
  Promise.resolve()
    .then(() => wrapOpenCall({}))
    .then((result) => {
      const hex = normalizeHex(result?.sRGBHex || result?.hex);
      if (!hex) {
        throw new Error("Custom color picker did not return a valid color.");
      }
      if (debugActive) {
        debugLog(
          "eyedropper:wrapper",
          "color-input-picked",
          trigger,
          describeColorInput(input),
          hex,
        );
        logEyeDropper(
          "eyedropper:wrapper",
          "color-input-picked",
          trigger,
          describeColorInput(input),
          hex,
        );
      }
      input.value = hex;
      dispatchSyntheticEvent(input, "input");
      dispatchSyntheticEvent(input, "change");
    })
    .catch((error) => {
      const aborted = errorName(error) === "AbortError";
      if (debugActive) {
        debugLog(
          "eyedropper:wrapper",
          aborted ? "color-input-abort" : "color-input-error",
          trigger,
          describeColorInput(input),
          errorMessage(error),
        );
      }
      if (!aborted) {
        console.error("[canva:eyedropper:wrapper] color-input-error", error);
      }
    })
    .finally(() => {
      pendingInput.__canvaCustomColorInputPending = false;
    });
}

/**
 * @param {EventTarget} target
 * @param {string} type
 * @returns {void}
 */
function dispatchSyntheticEvent(target, type) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: false,
    composed: true,
  });
  target.dispatchEvent(event);
}

/**
 * @param {unknown} input
 * @returns {input is HTMLInputElement}
 */
function isColorInput(input) {
  return (
    input instanceof HTMLInputElement &&
    String(input.type).toLowerCase() === "color"
  );
}

/**
 * @param {unknown} input
 * @returns {string}
 */
function describeColorInput(input) {
  if (!isColorInput(input)) return "input:unknown";
  const id = input.id ? `#${input.id}` : "";
  const name = input.name ? `[name=${input.name}]` : "";
  const hidden = input.hidden || input.type === "hidden" ? "hidden" : "visible";
  const classes =
    typeof input.className === "string" && input.className.trim()
      ? `.${input.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `input[type=color]${id}${name}${classes}:${hidden}`;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeHex(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match && match[1] ? `#${match[1].toLowerCase()}` : null;
}

/**
 * @param {unknown} value
 * @returns {value is PromiseLike<unknown>}
 */
function isPromiseLike(value) {
  return Boolean(
    value &&
      typeof (/** @type {{ then?: unknown }} */ value.then) === "function",
  );
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorName(error) {
  return error &&
    typeof error === "object" &&
    "name" in error &&
    typeof error.name === "string"
    ? error.name
    : "Error";
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error) {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : String(error);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function serializeValue(value) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

/**
 * @param {MediaStreamLike | null | undefined} stream
 * @returns {string}
 */
function summarizeStream(stream) {
  if (!stream || typeof stream.getTracks !== "function") {
    return "no-tracks";
  }
  const tracks = stream.getTracks();
  if (!tracks.length) return "no-tracks";
  return tracks
    .map((track) => {
      const label = track.label ? `:${track.label}` : "";
      return `${track.kind}:${track.readyState}${label}`;
    })
    .join(",");
}

/**
 * @param {unknown} target
 * @returns {string}
 */
function describeTarget(target) {
  if (!target || typeof target !== "object") return "unknown";
  const element = /** @type {ElementLike} */ target;
  const tag = element.tagName ? String(element.tagName).toLowerCase() : "node";
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string" && element.className.trim()
      ? `.${element.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tag}${id}${className}`;
}

/**
 * @returns {string}
 */
function lastActivationSummary() {
  const scope = getEyeDropperRoutingScope();
  const activation = scope.__canvaLastCaptureActivation;
  if (!activation || !activation.timestamp) {
    return "activation=none";
  }
  return [
    `activation=${activation.event || "unknown"}`,
    `ageMs=${Math.max(0, Date.now() - activation.timestamp)}`,
    `target=${activation.target || "unknown"}`,
    `active=${activation.active || "unknown"}`,
    `trusted=${activation.trusted || "false"}`,
  ].join(" ");
}

module.exports = {
  describeTarget,
  normalizeHex,
  serializeValue,
  summarizeStream,
  installEyeDropperRoutingDiagnostics,
};
