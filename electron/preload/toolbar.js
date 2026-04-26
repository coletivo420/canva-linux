'use strict';

// Expose a tiny read-only bridge for the custom tab bar UI.
const { contextBridge, ipcRenderer } = require('electron');

// This preload runs with sandbox enabled, so it cannot rely on loading local
// helper modules via relative require(). Keep the debug transport inline here.
const DEBUG_CATEGORY_ALIASES = {
  drag: 'dnd',
  toolbar: 'tabs:toolbar',
  'tabs-toolbar': 'tabs:toolbar',
  'toolbar-tabs': 'tabs:toolbar',
  'tabs-state': 'tabs:state',
  state: 'tabs:state',
  'tab-state': 'tabs:state',
  'tabs-nav': 'tabs:navigation',
  'tab-nav': 'tabs:navigation',
  'tabs-view': 'tabs:view',
  'tab-view': 'tabs:view',
};

function normalizeDebugCategory(category = 'app') {
  const raw = String(category || 'app')
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ':')
    .replace(/\s+/g, '')
    .replace(/:+/g, ':')
    .replace(/^:+|:+$/g, '');
  return DEBUG_CATEGORY_ALIASES[raw] || raw || 'app';
}

function matchesDebugToken(token, category) {
  if (!token || !category) return false;
  if (token === 'all' || token === '*') return true;
  if (token === category) return true;
  if (category.startsWith(`${token}:`)) return true;
  if (token.endsWith('*')) {
    const prefix = token.slice(0, -1);
    return prefix ? category.startsWith(prefix) : true;
  }
  return false;
}

const DEBUG_SPEC = String(process?.env?.CANVA_DEBUG || '').trim();
const DEBUG_TOKENS = new Set(
  DEBUG_SPEC
    .split(',')
    .map((item) => normalizeDebugCategory(item))
    .filter(Boolean)
);

function debugEnabled(category = 'app') {
  const normalizedSpec = DEBUG_SPEC.toLowerCase();
  if (!normalizedSpec || normalizedSpec === '0' || normalizedSpec === 'false') {
    return false;
  }
  const normalized = normalizeDebugCategory(category);
  if (['1', 'true', 'all', '*'].includes(normalizedSpec)) {
    return true;
  }
  for (const token of DEBUG_TOKENS) {
    if (matchesDebugToken(token, normalized)) {
      return true;
    }
  }
  return false;
}

function debugLog(category, ...args) {
  const normalized = normalizeDebugCategory(category);
  if (!debugEnabled(normalized)) return;
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
