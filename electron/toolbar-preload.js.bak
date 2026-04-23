'use strict';

// Expose a tiny read-only bridge for the custom tab bar UI.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('canvaTabs', {
  send(action, payload = {}) {
    ipcRenderer.send('toolbar-action', { action, payload });
  },
  onState(callback) {
    ipcRenderer.removeAllListeners('tabs-state');
    ipcRenderer.on('tabs-state', (_event, state) => callback(state));
  },
  getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
});
