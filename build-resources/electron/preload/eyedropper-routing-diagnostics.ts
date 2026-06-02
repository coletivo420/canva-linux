// Keep eyedropper routing diagnostics isolated here. These hooks exist only to
// trace and redirect Canva-facing browser/native picker entrypoints back into
// CL-EyeDropper; they must not become an alternative colorpicker implementation.

type DebugLog = (category: string, ...args: unknown[]) => boolean;
type EyeDropperLog = (...args: unknown[]) => void;
type WrapOpenCall = (options?: EyeDropperOpenOptions) => Promise<{ sRGBHex?: string; hex?: string }>;

interface EyeDropperOpenOptions {
  signal?: AbortSignal;
}

interface EyeDropperRoutingOptions {
  debugEnabled: (category?: string) => boolean;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  wrapOpenCall?: WrapOpenCall;
}

interface MediaStreamLike {
  getTracks?: () => Array<{ kind?: string; readyState?: string; label?: string }>;
}

interface ElementLike {
  tagName?: unknown;
  id?: unknown;
  className?: unknown;
}

type PendingColorInput = HTMLInputElement & { __canvaCustomColorInputPending?: boolean };

type EyeDropperRoutingScope = typeof globalThis & {
  __canvaEyeDropperRoutingDiagnosticsInstalled?: boolean;
  __canvaLastCaptureActivation?: {
    event?: string;
    timestamp?: number;
    target?: string;
    active?: string;
    trusted?: string;
    button?: number | string;
    buttons?: number | string;
    detail?: number | string;
  };
  MediaDevices?: { prototype?: Record<string, unknown> };
  HTMLInputElement?: { prototype?: Record<string, unknown> };
  navigator: Navigator;
};

function installEyeDropperRoutingDiagnostics({
  debugEnabled,
  debugLog,
  logEyeDropper,
  wrapOpenCall,
}: EyeDropperRoutingOptions): void {
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

function getEyeDropperRoutingScope(): EyeDropperRoutingScope {
  return globalThis as unknown as EyeDropperRoutingScope;
}

function installRecentActivationTrace({
  debugLog,
  logEyeDropper,
  debugActive,
}: {
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  debugActive: boolean;
}): void {
  const scope = getEyeDropperRoutingScope();

  const update = (eventName: string, event: MouseEvent | KeyboardEvent | PointerEvent) => {
    const summary = {
      event: eventName,
      timestamp: Date.now(),
      trusted: event?.isTrusted ? "true" : "false",
      target: describeTarget(event?.target),
      button: Number.isFinite((event as MouseEvent).button)
        ? (event as MouseEvent).button
        : "na",
      buttons: Number.isFinite((event as MouseEvent).buttons)
        ? (event as MouseEvent).buttons
        : "na",
      detail: Number.isFinite((event as any)?.detail) ? (event as any).detail : "na",
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
}: {
  scope: EyeDropperRoutingScope;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  debugActive: boolean;
}): void {
  const mediaDevices = scope?.navigator?.mediaDevices;
  const proto = scope?.MediaDevices?.prototype;

  const wrappedDisplayInstance = wrapMethod({
    target: mediaDevices as unknown as Record<string, unknown>,
    methodName: "getDisplayMedia",
    receiverFallback: mediaDevices as unknown as Record<string, unknown>,
    debugLog,
    logEyeDropper,
    debugActive,
    label: "navigator.mediaDevices",
  });
  const wrappedDisplayProto = wrapMethod({
    target: proto as unknown as Record<string, unknown>,
    methodName: "getDisplayMedia",
    debugLog,
    logEyeDropper,
    debugActive,
    label: "MediaDevices.prototype",
  });
  const wrappedUserInstance = wrapMethod({
    target: mediaDevices as unknown as Record<string, unknown>,
    methodName: "getUserMedia",
    receiverFallback: mediaDevices as unknown as Record<string, unknown>,
    debugLog,
    logEyeDropper,
    debugActive,
    label: "navigator.mediaDevices",
  });
  const wrappedUserProto = wrapMethod({
    target: proto as unknown as Record<string, unknown>,
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
      (process as any).isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
  if (debugActive && !wrappedUserInstance && !wrappedUserProto) {
    logEyeDropper(
      "eyedropper:routing",
      "getUserMedia-unavailable",
      (process as any).isMainFrame ? "main-frame" : "sub-frame",
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
}: {
  scope: EyeDropperRoutingScope;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  debugActive: boolean;
}): void {
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

function wrapMethod({
  target,
  methodName,
  receiverFallback,
  debugLog,
  logEyeDropper,
  debugActive,
  label,
}: {
  target: Record<string, unknown> | null | undefined;
  receiverFallback?: Record<string, unknown> | null | undefined;
  methodName: string;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  debugActive: boolean;
  label: string;
}): boolean {
  if (!target || typeof target[methodName] !== "function") {
    return false;
  }
  const original = target[methodName] as ((...args: unknown[]) => unknown) & {
    __canvaDebugWrapped?: boolean;
    name?: string;
  };
  if (original.__canvaDebugWrapped) {
    return true;
  }

  const wrapped = function wrappedMediaMethod(
    this: unknown,
    ...args: unknown[]
  ) {
      const activation = lastActivationSummary();
      const serializedArgs =
        args.length > 0 ? serializeValue(args[0]) : "args=none";
      if (debugActive) {
        debugLog(
          "eyedropper:routing",
          `${methodName}-call`,
          label,
          (process as any).isMainFrame ? "main-frame" : "sub-frame",
          location.href,
          serializedArgs,
          activation,
        );
        logEyeDropper(
          "eyedropper:routing",
          `${methodName}-call`,
          label,
          (process as any).isMainFrame ? "main-frame" : "sub-frame",
          location.href,
          serializedArgs,
          activation,
        );
      }

      let result;
      try {
        const receiver = safeNativeReceiver(this, receiverFallback ?? target);
        result = original.apply(receiver, args);
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
            stream as MediaStreamLike | null | undefined,
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
    } as ((this: unknown, ...args: unknown[]) => unknown) & {
      __canvaDebugWrapped?: boolean;
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
      (process as any).isMainFrame ? "main-frame" : "sub-frame",
      location.href,
    );
  }
  return true;
}

/**
 * @param {unknown} candidate
 * @param {unknown} fallback
 * @returns {unknown}
 */
function safeNativeReceiver(candidate: unknown, fallback: unknown): unknown {
  const windowObject = typeof window === "undefined" ? undefined : window;
  if (
    candidate &&
    candidate !== globalThis &&
    candidate !== windowObject
  ) {
    return candidate;
  }
  return fallback;
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
}: {
  scope: EyeDropperRoutingScope;
  methodName: string;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  debugActive: boolean;
}): void {
  const navigatorObject = scope?.navigator;
  const navigatorRecord =
    navigatorObject as unknown as Record<string, unknown>;
  if (!navigatorRecord || typeof navigatorRecord[methodName] !== "function") {
    return;
  }
  const original =
    navigatorRecord[
      methodName
    ] as ((...args: unknown[]) => unknown) & { __canvaDebugWrapped?: boolean };
  if (original.__canvaDebugWrapped) {
    return;
  }

  const wrapped =
    function wrappedLegacyGetUserMedia(
      this: unknown,
      ...args: unknown[]
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
    } as ((this: unknown, ...args: unknown[]) => unknown) & { __canvaDebugWrapped?: boolean };

  wrapped.__canvaDebugWrapped = true;
  navigatorRecord[methodName] = wrapped;
  if (debugActive) {
    logEyeDropper(
      "eyedropper:routing",
      `${methodName}-wrapped`,
      "navigator",
      (process as any).isMainFrame ? "main-frame" : "sub-frame",
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
}: {
  scope: EyeDropperRoutingScope;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  wrapOpenCall?: WrapOpenCall;
  debugActive: boolean;
}): void {
  if (typeof wrapOpenCall !== "function") return;

  const inputProto = scope?.HTMLInputElement?.prototype;
  if (!inputProto) return;

  wrapColorInputMethod({
    prototype: inputProto as unknown as Record<string, unknown>,
    methodName: "showPicker",
    debugLog,
    logEyeDropper,
    wrapOpenCall,
    debugActive,
  });
  wrapColorInputMethod({
    prototype: inputProto as unknown as Record<string, unknown>,
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
}: {
  prototype: Record<string, unknown>;
  methodName: string;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  wrapOpenCall: WrapOpenCall;
  debugActive: boolean;
}): void {
  if (typeof prototype[methodName] !== "function") return;
  const original =
    prototype[
      methodName
    ] as ((...args: unknown[]) => unknown) & Record<string, unknown>;
  const marker = `__canvaColorInput${methodName}Wrapped`;
  if (original[marker]) return;

  const wrapped =
    function wrappedColorInputMethod(
      this: HTMLInputElement,
      ...args: unknown[]
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
    } as ((this: HTMLInputElement, ...args: unknown[]) => unknown) & Record<string, unknown>;

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
}: {
  input: HTMLInputElement;
  wrapOpenCall: WrapOpenCall;
  debugLog: DebugLog;
  logEyeDropper: EyeDropperLog;
  trigger: string;
  debugActive: boolean;
}): void {
  const pendingInput = input as PendingColorInput;
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
function dispatchSyntheticEvent(target: EventTarget, type: string): void {
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
function isColorInput(input: unknown): input is HTMLInputElement {
  return (
    input instanceof HTMLInputElement &&
    String(input.type).toLowerCase() === "color"
  );
}

/**
 * @param {unknown} input
 * @returns {string}
 */
function describeColorInput(input: unknown): string {
  if (!isColorInput(input)) return "input:unknown";
  const id = input.id ? `#${input.id}` : "";
  const name = input.name ? `[name=${input.name}]` : "";
  const hidden = (input as any).hidden || input.type === "hidden" ? "hidden" : "visible";
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
function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match && match[1] ? `#${match[1].toLowerCase()}` : null;
}

/**
 * @param {unknown} value
 * @returns {value is PromiseLike<unknown>}
 */
function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return Boolean(
    value &&
      typeof (value as any).then === "function",
  );
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorName(error: unknown): string {
  return error &&
    typeof error === "object" &&
    "name" in error &&
    typeof (error as any).name === "string"
    ? (error as any).name
    : "Error";
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorMessage(error: unknown): string {
  return error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as any).message === "string"
    ? (error as any).message
    : String(error);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function serializeValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  try {
    return JSON.stringify(value, (key, nestedValue) =>
      /(?:cookie|token|code|state)/i.test(key) ? "[redacted]" : nestedValue,
    );
  } catch {
    return "[unserializable]";
  }
}

/**
 * @param {MediaStreamLike | null | undefined} stream
 * @returns {string}
 */
function summarizeStream(stream: MediaStreamLike | null | undefined): string {
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
function describeTarget(target: unknown): string {
  if (!target || typeof target !== "object") return "unknown";
  const element = target as ElementLike;
  const tag = element.tagName ? String(element.tagName).toLowerCase() : "node";
  const id = element.id ? `#${element.id}` : "";
  const className =
    typeof element.className === "string" && (element.className as string).trim()
      ? `.${(element.className as string).trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
  return `${tag}${id}${className}`;
}

/**
 * @returns {string}
 */
function lastActivationSummary(): string {
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

export {
  describeTarget,
  normalizeHex,
  serializeValue,
  summarizeStream,
  installEyeDropperRoutingDiagnostics,
};
