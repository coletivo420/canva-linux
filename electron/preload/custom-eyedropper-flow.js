'use strict';

const { ipcRenderer } = require('electron');

const {
  LTCodeEyeDropper,
  installLtcodeScalingPatch,
  removeLtcodeUi,
} = require('./ltcode-eyedropper');

function createAbortError() {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function createOperationError(message) {
  return new DOMException(message || 'The operation failed.', 'OperationError');
}

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `#${match[1].toLowerCase()}` : null;
}

function createSnapshotCanvas(snapshot, { logEyeDropper }) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const cssWidth = Math.max(1, Number(snapshot?.cssWidth) || window.innerWidth || image.naturalWidth || 1);
      const cssHeight = Math.max(1, Number(snapshot?.cssHeight) || window.innerHeight || image.naturalHeight || 1);
      const nativeWidth = Math.max(1, Number(snapshot?.width) || image.naturalWidth || cssWidth);
      const nativeHeight = Math.max(1, Number(snapshot?.height) || image.naturalHeight || cssHeight);

      const host = document.createElement('div');
      host.setAttribute('data-canva-eyedropper-host', 'true');
      Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483646',
        background: 'transparent',
        cursor: 'crosshair',
        pointerEvents: 'auto',
        overflow: 'hidden',
      });

      const canvas = document.createElement('canvas');
      canvas.width = nativeWidth;
      canvas.height = nativeHeight;
      Object.assign(canvas.style, {
        position: 'absolute',
        inset: '0',
        width: `${cssWidth}px`,
        height: `${cssHeight}px`,
        display: 'block',
        cursor: 'crosshair',
        pointerEvents: 'auto',
      });

      const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
      if (!context) {
        reject(new Error('Failed to create the color picker canvas.'));
        return;
      }

      logEyeDropper('eyedropper:flow', 'canvas', `${nativeWidth}x${nativeHeight}`, 'css', `${cssWidth}x${cssHeight}`, 'image', `${image.naturalWidth}x${image.naturalHeight}`);

      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, nativeWidth, nativeHeight);
      context.drawImage(image, 0, 0, nativeWidth, nativeHeight);

      host.appendChild(canvas);
      (document.body || document.documentElement).appendChild(host);
      resolve({ host, canvas });
    };
    image.onerror = () => reject(new Error('Failed to load the Canva window snapshot.'));
    image.src = snapshot.dataUrl;
  });
}

// Own the bundled ltcodedev/eyedropper snapshot/open lifecycle separately from
// the wrapper installation so the preload entrypoint stays focused on
// composition.
function createCustomEyeDropperFlow({ debugLog, logEyeDropper }) {
  let activePickerCleanup = null;

  async function openLtcodeEyeDropper() {
    if (activePickerCleanup) {
      throw createOperationError('A color picker is already active.');
    }

    installLtcodeScalingPatch(logEyeDropper);
    debugLog('eyedropper:flow', 'open-request', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);
    logEyeDropper('eyedropper:flow', 'open-request', process.isMainFrame ? 'main-frame' : 'sub-frame', location.href);

    const snapshot = await ipcRenderer.invoke('wrapper:eyedropper-snapshot');
    if (!snapshot || typeof snapshot.dataUrl !== 'string') {
      debugLog('eyedropper:flow', 'snapshot-invalid', typeof snapshot);
      throw createOperationError('The Canva window snapshot failed.');
    }
    debugLog(
      'eyedropper:flow',
      'snapshot-ready',
      `${snapshot.width || 'unknown'}x${snapshot.height || 'unknown'}`,
      'css',
      `${snapshot.cssWidth || 'unknown'}x${snapshot.cssHeight || 'unknown'}`
    );

    const { host, canvas } = await createSnapshotCanvas(snapshot, { logEyeDropper });
    const eyedropper = new LTCodeEyeDropper({
      overlay: {
        background: 'rgba(0,0,0,0)',
        zIndex: 2147483647,
      },
      magnifier: {
        width: '96px',
        height: '96px',
        size: 18,
        zoom: 6,
        border: '2px solid rgba(17,24,39,0.92)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.28)',
        background: '#fff',
      },
      preview: {
        background: 'rgba(17,24,39,0.96)',
        color: '#fff',
        borderRadius: '10px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.28)',
        padding: '8px 12px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        minWidth: '96px',
        zIndex: 2147483647,
      },
    });

    return await new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        if (activePickerCleanup === cleanup) {
          activePickerCleanup = null;
        }
        removeLtcodeUi();
        host.remove();
        window.removeEventListener('keydown', onKeyDown, true);
      };

      const finishResolve = (payload) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(payload);
      };

      const finishReject = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finishReject(createAbortError());
        }
      };

      activePickerCleanup = cleanup;
      window.addEventListener('keydown', onKeyDown, true);

      requestAnimationFrame(() => {
        Promise.resolve(eyedropper.open(canvas)).then((result) => {
          debugLog('eyedropper:flow', 'open-resolved');
          const hex = normalizeHex(result?.hex || result?.sRGBHex);
          if (!hex) {
            finishReject(createOperationError('The color picker library did not return a valid color.'));
            return;
          }
          finishResolve({ sRGBHex: hex });
        }).catch((error) => {
          debugLog('eyedropper:flow', 'open-rejected', error && error.message ? error.message : 'unknown-error');
          if (error && (error.name === 'AbortError' || /abort/i.test(String(error.message || '')))) {
            finishReject(createAbortError());
            return;
          }
          finishReject(createOperationError(error && error.message ? error.message : 'The color picker failed.'));
        });
      });
    });
  }

  function wrapOpenCall(options = {}) {
    const signal = options?.signal;
    if (signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    let abortHandler;
    const pickPromise = openLtcodeEyeDropper().then((result) => {
      if (!result || typeof result.sRGBHex !== 'string') {
        throw createOperationError('The wrapper eye dropper did not return a valid color.');
      }
      return { sRGBHex: result.sRGBHex };
    }).catch((error) => {
      if (error && error.name === 'AbortError') {
        throw createAbortError();
      }
      throw createOperationError(error && error.message ? error.message : 'The wrapper eye dropper failed.');
    });

    if (!signal) {
      return pickPromise;
    }

    const abortPromise = new Promise((_, reject) => {
      abortHandler = () => reject(createAbortError());
      signal.addEventListener('abort', abortHandler, { once: true });
    });

    return Promise.race([pickPromise, abortPromise]).finally(() => {
      if (abortHandler) signal.removeEventListener('abort', abortHandler);
    });
  }

  return {
    wrapOpenCall,
  };
}

module.exports = {
  createCustomEyeDropperFlow,
};
