'use strict';

// Expose a tiny read-only bridge for the custom tab bar UI.
const { contextBridge, ipcRenderer } = require('electron');

// This preload runs with sandbox enabled, so it cannot rely on loading local
// helper modules via relative require(). Keep the debug transport inline here.
function normalizeDebugCategory(category = 'app') {
  const raw = String(category || 'app')
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ':')
    .replace(/\s+/g, '')
    .replace(/:+/g, ':')
    .replace(/^:+|:+$/g, '');
  return raw || 'app';
}

function getDebugLevel() {
  const explicit = String(process?.env?.CANVA_DEBUG_LEVEL || '').trim();
  if (explicit === '1' || explicit === '2') return Number(explicit);

  const fallback = String(process?.env?.CANVA_DEBUG || '').trim();
  if (fallback === '1' || fallback === '2') return Number(fallback);

  return 0;
}

function debugEnabled() {
  return getDebugLevel() > 0;
}

function debugLog(category, ...args) {
  const normalized = normalizeDebugCategory(category);
  if (!debugEnabled()) return;
  try {
    ipcRenderer.send('wrapper:debug-log', { category: normalized, args, source: 'toolbar-preload' });
  } catch {
    try {
      console.log(`[canva:toolbar-preload:${normalized}]`, ...args);
    } catch {}
  }
}

debugLog('tabs:toolbar', 'toolbar-preload-loaded');

contextBridge.exposeInMainWorld('canvaTabs', {
  send(action, payload = {}) {
    debugLog('tabs:toolbar', 'toolbar-send', action, JSON.stringify(payload));
    ipcRenderer.send('toolbar-action', { action, payload });
  },
  onState(callback) {
    ipcRenderer.removeAllListeners('tabs-state');
    ipcRenderer.on('tabs-state', (_event, state) => {
      debugLog('tabs:state', 'toolbar-state', `count=${state?.tabs?.length || 0}`, `active=${state?.activeTabId || 'none'}`);
      callback(state);
    });
  },
  getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
});

window.addEventListener('error', (event) => {
  debugLog('tabs:toolbar', 'toolbar-window-error', event.message || 'unknown-error', event.filename || 'inline', `line=${event.lineno || 0}`);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason instanceof Error ? event.reason.stack || event.reason.message : String(event?.reason || 'unknown-rejection');
  debugLog('tabs:toolbar', 'toolbar-unhandled-rejection', reason);
});
