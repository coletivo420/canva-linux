'use strict';

// Expose a tiny read-only bridge for the custom tab bar UI.
const { contextBridge, ipcRenderer } = require('electron');

const DEBUG_SPEC = String(process?.env?.CANVA_DEBUG || '').trim();

function normalizeDebugCategory(category = 'app') {
  const normalized = String(category || 'app').trim().toLowerCase();
  if (!normalized) return 'app';

  switch (normalized) {
    case 'drag':
      return 'dnd';
    case 'tab':
      return 'tabs';
    case 'permission':
      return 'permissions';
    default:
      return normalized;
  }
}

const DEBUG_TOKENS = new Set(
  DEBUG_SPEC
    .split(',')
    .map((item) => normalizeDebugCategory(item))
    .filter(Boolean)
);

function debugEnabled(category = 'app') {
  if (!DEBUG_SPEC || DEBUG_SPEC === '0' || DEBUG_SPEC.toLowerCase() === 'false') {
    return false;
  }
  const normalized = normalizeDebugCategory(category);
  if (['1', 'true', 'all', '*'].includes(DEBUG_SPEC.toLowerCase())) {
    return true;
  }
  return DEBUG_TOKENS.has('all') || DEBUG_TOKENS.has('*') || DEBUG_TOKENS.has(normalized);
}

function safeSerialize(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable-payload]';
  }
}

function debugLog(category, ...args) {
  const normalized = normalizeDebugCategory(category);
  if (!debugEnabled(normalized)) return;
  try {
    ipcRenderer.send('wrapper:debug-log', { category: normalized, args });
  } catch {
    try {
      console.log(`[canva:${normalized}]`, ...args);
    } catch {}
  }
}

debugLog('tabs', 'toolbar-preload-loaded');

contextBridge.exposeInMainWorld('canvaTabs', {
  send(action, payload = {}) {
    debugLog('tabs', 'toolbar-send', action, safeSerialize(payload));
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
