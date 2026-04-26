'use strict';

// Keep eyedropper routing diagnostics isolated here. These hooks exist only to
// trace and redirect Canva-facing browser/native picker entrypoints back into
// the bundled ltcodedev/eyedropper path; they must not become an alternative
// colorpicker implementation.

function installEyeDropperRoutingDiagnostics({ debugEnabled, debugLog, logEyeDropper, wrapOpenCall }) {
  const debugActive = debugEnabled('eyedropper') || debugEnabled('eyedropper:routing');
  const interceptActive = typeof wrapOpenCall === 'function';
  if (!debugActive && !interceptActive) {
    return;
  }

  const scope = globalThis || window;
  if (scope.__canvaEyeDropperRoutingDiagnosticsInstalled) {
    return;
  }
  scope.__canvaEyeDropperRoutingDiagnosticsInstalled = true;

  installRecentActivationTrace({ debugLog, logEyeDropper, debugActive });
  installMediaDevicesDiagnostics({ scope, debugLog, logEyeDropper, debugActive });
  installLegacyGetUserMediaDiagnostics({ scope, debugLog, logEyeDropper, debugActive });
  installColorInputInterception({ scope, debugLog, logEyeDropper, wrapOpenCall, debugActive });
}

function installRecentActivationTrace({ debugLog, logEyeDropper, debugActive }) {
  const scope = globalThis || window;
  const update = (eventName, event) => {
    const summary = {
      event: eventName,
      timestamp: Date.now(),
      trusted: event?.isTrusted ? 'true' : 'false',
      target: describeTarget(event?.target),
      button: Number.isFinite(event?.button) ? event.button : 'na',
      buttons: Number.isFinite(event?.buttons) ? event.buttons : 'na',
      detail: Number.isFinite(event?.detail) ? event.detail : 'na',
      active: describeTarget(document.activeElement),
    };
    scope.__canvaLastCaptureActivation = summary;
    if (!debugActive) return;
    debugLog(
      'eyedropper:routing',
      'activation',
      summary.event,
      `trusted=${summary.trusted}`,
      `target=${summary.target}`,
      `button=${summary.button}`,
      `buttons=${summary.buttons}`,
      `detail=${summary.detail}`,
      `active=${summary.active}`
    );
  };

  window.addEventListener('pointerdown', (event) => update('pointerdown', event), true);
  window.addEventListener('mousedown', (event) => update('mousedown', event), true);
  window.addEventListener('click', (event) => update('click', event), true);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      update(`keydown:${event.key}`, event);
    }
  }, true);

  if (debugActive) {
    logEyeDropper('eyedropper:routing', 'activation-trace-installed', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  }
}

function installMediaDevicesDiagnostics({ scope, debugLog, logEyeDropper, debugActive }) {
  const mediaDevices = scope?.navigator?.mediaDevices;
  const proto = scope?.MediaDevices?.prototype;

  const wrappedDisplayInstance = wrapMethod({
    target: mediaDevices,
    methodName: 'getDisplayMedia',
    debugLog,
    logEyeDropper,
    debugActive,
    label: 'navigator.mediaDevices',
  });
  const wrappedDisplayProto = wrapMethod({
    target: proto,
    methodName: 'getDisplayMedia',
    debugLog,
    logEyeDropper,
    debugActive,
    label: 'MediaDevices.prototype',
  });
  const wrappedUserInstance = wrapMethod({
    target: mediaDevices,
    methodName: 'getUserMedia',
    debugLog,
    logEyeDropper,
    debugActive,
    label: 'navigator.mediaDevices',
  });
  const wrappedUserProto = wrapMethod({
    target: proto,
    methodName: 'getUserMedia',
    debugLog,
    logEyeDropper,
    debugActive,
    label: 'MediaDevices.prototype',
  });

  if (debugActive && !wrappedDisplayInstance && !wrappedDisplayProto) {
    logEyeDropper('eyedropper:routing', 'getDisplayMedia-unavailable', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  }
  if (debugActive && !wrappedUserInstance && !wrappedUserProto) {
    logEyeDropper('eyedropper:routing', 'getUserMedia-unavailable', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  }
}

function installLegacyGetUserMediaDiagnostics({ scope, debugLog, logEyeDropper, debugActive }) {
  wrapLegacyNavigatorMethod({
    scope,
    methodName: 'getUserMedia',
    debugLog,
    logEyeDropper,
    debugActive,
  });
  wrapLegacyNavigatorMethod({
    scope,
    methodName: 'webkitGetUserMedia',
    debugLog,
    logEyeDropper,
    debugActive,
  });
  wrapLegacyNavigatorMethod({
    scope,
    methodName: 'mozGetUserMedia',
    debugLog,
    logEyeDropper,
    debugActive,
  });
}

function wrapMethod({ target, methodName, debugLog, logEyeDropper, debugActive, label }) {
  if (!target || typeof target[methodName] !== 'function') {
    return false;
  }
  const original = target[methodName];
  if (original.__canvaDebugWrapped) {
    return true;
  }

  const wrapped = function wrappedMediaMethod(...args) {
    const activation = lastActivationSummary();
    const serializedArgs = args.length > 0 ? serializeValue(args[0]) : 'args=none';
    if (debugActive) {
      debugLog(
        'eyedropper:routing',
        `${methodName}-call`,
        label,
        process.isMainFrame ? 'main-frame' : 'sub-frame',
        location.href,
        serializedArgs,
        activation
      );
      logEyeDropper(
        'eyedropper:routing',
        `${methodName}-call`,
        label,
        process.isMainFrame ? 'main-frame' : 'sub-frame',
        location.href,
        serializedArgs,
        activation
      );
    }

    let result;
    try {
      result = original.apply(this, args);
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      if (debugActive) {
        debugLog('eyedropper:routing', `${methodName}-throw`, label, error?.name || 'Error', message);
        logEyeDropper('eyedropper:routing', `${methodName}-throw`, label, error?.name || 'Error', message);
      }
      throw error;
    }

    if (!result || typeof result.then !== 'function') {
      if (debugActive) {
        debugLog('eyedropper:routing', `${methodName}-return`, label, typeof result);
        logEyeDropper('eyedropper:routing', `${methodName}-return`, label, typeof result);
      }
      return result;
    }

    return result.then((stream) => {
      const trackSummary = summarizeStream(stream);
      if (debugActive) {
        debugLog('eyedropper:routing', `${methodName}-resolved`, label, trackSummary);
        logEyeDropper('eyedropper:routing', `${methodName}-resolved`, label, trackSummary);
      }
      return stream;
    }).catch((error) => {
      const message = error && error.message ? error.message : String(error);
      if (debugActive) {
        debugLog('eyedropper:routing', `${methodName}-rejected`, label, error?.name || 'Error', message);
        logEyeDropper('eyedropper:routing', `${methodName}-rejected`, label, error?.name || 'Error', message);
      }
      throw error;
    });
  };

  wrapped.__canvaDebugWrapped = true;
  Object.defineProperty(wrapped, 'name', {
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
      'eyedropper:routing',
      `${methodName}-wrapped`,
      label,
      process.isMainFrame ? 'main-frame' : 'sub-frame',
      location.href
    );
  }
  return true;
}

function wrapLegacyNavigatorMethod({ scope, methodName, debugLog, logEyeDropper, debugActive }) {
  const navigatorObject = scope?.navigator;
  if (!navigatorObject || typeof navigatorObject[methodName] !== 'function') {
    return;
  }
  const original = navigatorObject[methodName];
  if (original.__canvaDebugWrapped) {
    return;
  }

  const wrapped = function wrappedLegacyGetUserMedia(...args) {
    const serializedArgs = args.length > 0 ? serializeValue(args[0]) : 'args=none';
    const activation = lastActivationSummary();
    if (debugActive) {
      debugLog('eyedropper:routing', `${methodName}-call`, 'navigator', serializedArgs, activation);
      logEyeDropper('eyedropper:routing', `${methodName}-call`, 'navigator', serializedArgs, activation);
    }
    return original.apply(this, args);
  };

  wrapped.__canvaDebugWrapped = true;
  navigatorObject[methodName] = wrapped;
  if (debugActive) {
    logEyeDropper('eyedropper:routing', `${methodName}-wrapped`, 'navigator', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
  }
}

function installColorInputInterception({ scope, debugLog, logEyeDropper, wrapOpenCall, debugActive }) {
  if (typeof wrapOpenCall !== 'function') return;

  const inputProto = scope?.HTMLInputElement?.prototype;
  if (!inputProto) return;

  wrapColorInputMethod({
    prototype: inputProto,
    methodName: 'showPicker',
    debugLog,
    logEyeDropper,
    wrapOpenCall,
    debugActive,
  });
  wrapColorInputMethod({
    prototype: inputProto,
    methodName: 'click',
    debugLog,
    logEyeDropper,
    wrapOpenCall,
    debugActive,
  });

  window.addEventListener('click', (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!isColorInput(input)) return;
    if (debugActive) {
      debugLog('eyedropper:wrapper', 'color-input-dom-click', describeColorInput(input), lastActivationSummary());
    }
    event.preventDefault();
    openCustomColorInput({ input, wrapOpenCall, debugLog, logEyeDropper, trigger: 'dom-click', debugActive });
  }, true);
}

function wrapColorInputMethod({ prototype, methodName, debugLog, logEyeDropper, wrapOpenCall, debugActive }) {
  if (typeof prototype[methodName] !== 'function') return;
  const original = prototype[methodName];
  const marker = `__canvaColorInput${methodName}Wrapped`;
  if (original[marker]) return;

  const wrapped = function wrappedColorInputMethod(...args) {
    if (!isColorInput(this)) {
      return original.apply(this, args);
    }
    if (debugActive) {
      debugLog('eyedropper:wrapper', `color-input-${methodName}`, describeColorInput(this), lastActivationSummary());
      logEyeDropper('eyedropper:wrapper', `color-input-${methodName}`, describeColorInput(this), lastActivationSummary());
    }
    if (methodName === 'click') {
      // Avoid letting Chromium open the native color picker for direct input.click().
      openCustomColorInput({ input: this, wrapOpenCall, debugLog, logEyeDropper, trigger: 'input.click', debugActive });
      return;
    }
    openCustomColorInput({ input: this, wrapOpenCall, debugLog, logEyeDropper, trigger: 'showPicker', debugActive });
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

function openCustomColorInput({ input, wrapOpenCall, debugLog, logEyeDropper, trigger, debugActive }) {
  if (!isColorInput(input) || input.__canvaCustomColorInputPending) return;
  input.__canvaCustomColorInputPending = true;
  Promise.resolve()
    .then(() => wrapOpenCall({}))
    .then((result) => {
      const hex = normalizeHex(result?.sRGBHex || result?.hex);
      if (!hex) {
        throw new Error('Custom color picker did not return a valid color.');
      }
      if (debugActive) {
        debugLog('eyedropper:wrapper', 'color-input-picked', trigger, describeColorInput(input), hex);
        logEyeDropper('eyedropper:wrapper', 'color-input-picked', trigger, describeColorInput(input), hex);
      }
      input.value = hex;
      dispatchSyntheticEvent(input, 'input');
      dispatchSyntheticEvent(input, 'change');
    })
    .catch((error) => {
      const aborted = error?.name === 'AbortError';
      if (debugActive) {
        debugLog(
          'eyedropper:wrapper',
          aborted ? 'color-input-abort' : 'color-input-error',
          trigger,
          describeColorInput(input),
          error?.message || String(error)
        );
      }
      if (!aborted) {
        console.error('[canva:eyedropper:wrapper] color-input-error', error);
      }
    })
    .finally(() => {
      input.__canvaCustomColorInputPending = false;
    });
}

function dispatchSyntheticEvent(target, type) {
  const event = new Event(type, { bubbles: true, cancelable: false, composed: true });
  target.dispatchEvent(event);
}

function isColorInput(input) {
  return input instanceof HTMLInputElement && String(input.type).toLowerCase() === 'color';
}

function describeColorInput(input) {
  if (!isColorInput(input)) return 'input:unknown';
  const id = input.id ? `#${input.id}` : '';
  const name = input.name ? `[name=${input.name}]` : '';
  const hidden = input.hidden || input.type === 'hidden' ? 'hidden' : 'visible';
  const classes = typeof input.className === 'string' && input.className.trim()
    ? `.${input.className.trim().split(/\s+/).slice(0, 3).join('.')}`
    : '';
  return `input[type=color]${id}${name}${classes}:${hidden}`;
}

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : null;
}

function serializeValue(value) {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function summarizeStream(stream) {
  if (!stream || typeof stream.getTracks !== 'function') {
    return 'no-tracks';
  }
  const tracks = stream.getTracks();
  if (!tracks.length) return 'no-tracks';
  return tracks.map((track) => {
    const label = track.label ? `:${track.label}` : '';
    return `${track.kind}:${track.readyState}${label}`;
  }).join(',');
}

function describeTarget(target) {
  if (!target || typeof target !== 'object') return 'unknown';
  const tag = target.tagName ? String(target.tagName).toLowerCase() : 'node';
  const id = target.id ? `#${target.id}` : '';
  const className = typeof target.className === 'string' && target.className.trim()
    ? `.${target.className.trim().split(/\s+/).slice(0, 3).join('.')}`
    : '';
  return `${tag}${id}${className}`;
}

function lastActivationSummary() {
  const scope = globalThis || window;
  const activation = scope.__canvaLastCaptureActivation;
  if (!activation || !activation.timestamp) {
    return 'activation=none';
  }
  return [
    `activation=${activation.event || 'unknown'}`,
    `ageMs=${Math.max(0, Date.now() - activation.timestamp)}`,
    `target=${activation.target || 'unknown'}`,
    `active=${activation.active || 'unknown'}`,
    `trusted=${activation.trusted || 'false'}`,
  ].join(' ');
}

module.exports = {
  installEyeDropperRoutingDiagnostics,
};
