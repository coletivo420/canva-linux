// Expose a tiny read-only bridge for the custom tab bar UI.
import { contextBridge, ipcRenderer } from 'electron';

// This preload runs with sandbox enabled, so it cannot rely on loading local
// helper modules via relative require(). Keep the debug transport inline here.
function normalizeDebugCategory(category: unknown = 'app'): string {
  const raw = String(category || 'app')
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ':')
    .replace(/\s+/g, '')
    .replace(/:+/g, ':')
    .replace(/^:+|:+$/g, '');
  return raw || 'app';
}

function getDebugLevel(): number {
  const explicit = String(process?.env?.CANVA_DEBUG_LEVEL || '').trim();
  if (explicit === '1' || explicit === '2') return Number(explicit);

  const fallback = String(process?.env?.CANVA_DEBUG || '').trim();
  if (fallback === '1' || fallback === '2') return Number(fallback);

  return 0;
}

function debugEnabled(): boolean {
  return getDebugLevel() > 0;
}

function debugLog(category: unknown, ...args: unknown[]): void {
  const normalized = normalizeDebugCategory(category);
  if (!debugEnabled()) return;
  try {
    ipcRenderer.send('wrapper:debug-log', { category: normalized, args, source: 'toolbar-preload' });
  } catch {
    try {
      console.log(`[canva:toolbar-preload:${normalized}]`, ...args);
    } catch {
      // Logging must never break toolbar boot.
    }
  }
}

debugLog('tabs:toolbar', 'toolbar-preload-loaded');

contextBridge.exposeInMainWorld('canvaTabs', {
  send(action: string, payload: Record<string, unknown> = {}) {
    debugLog('tabs:toolbar', 'toolbar-send', action, JSON.stringify(payload));
    ipcRenderer.send('toolbar-action', { action, payload });
  },
  onState(callback: (state: any) => void) {
    ipcRenderer.removeAllListeners('tabs-state');
    ipcRenderer.on('tabs-state', (_event, state) => {
      debugLog('tabs:state', 'toolbar-state', `count=${state?.tabs?.length || 0}`, `active=${state?.activeTabId || 'none'}`);
      callback(state);
    });
  },
  getSystemTheme(): 'dark' | 'light' {
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
