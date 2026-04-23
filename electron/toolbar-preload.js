'use strict';

// Expose a tiny read-only bridge for the custom tab bar UI.
const { contextBridge, ipcRenderer } = require('electron');

const DEBUG_SPEC = String(process?.env?.CANVA_DEBUG || '').trim();
const DEBUG_TOKENS = new Set(
  DEBUG_SPEC
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
);

function debugEnabled(category = 'app') {
  if (!DEBUG_SPEC || DEBUG_SPEC === '0' || DEBUG_SPEC.toLowerCase() === 'false') {
    return false;
  }
  const normalized = String(category || 'app').toLowerCase();
  if (['1', 'true', 'all', '*'].includes(DEBUG_SPEC.toLowerCase())) {
    return true;
  }
  return DEBUG_TOKENS.has('all') || DEBUG_TOKENS.has('*') || DEBUG_TOKENS.has(normalized);
}

function debugLog(category, ...args) {
  if (!debugEnabled(category)) return;
  try {
    ipcRenderer.send('wrapper:debug-log', { category, args });
  } catch {
    try {
      console.log(`[canva:${String(category).toLowerCase()}]`, ...args);
    } catch {}
  }
}

debugLog('tabs', 'toolbar-preload-loaded');

contextBridge.exposeInMainWorld('canvaTabs', {
  send(action, payload = {}) {
    debugLog('tabs', 'toolbar-send', action, JSON.stringify(payload));
    ipcRenderer.send('toolbar-action', { action, payload });
  },
  onState(callback) {
    ipcRenderer.removeAllListeners('tabs-state');
    ipcRenderer.on('tabs-state', (_event, state) => {
      debugLog('tabs', 'toolbar-state', `count=${state?.tabs?.length || 0}`, `active=${state?.activeTabId || 'none'}`);
      callback(state);
    });
  },
  getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
});
