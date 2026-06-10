import type { ContextBridge, IpcRenderer } from "electron";

type ElectronPreloadApi = {
  contextBridge: ContextBridge;
  ipcRenderer: IpcRenderer;
};

type PreloadGlobal = typeof globalThis & {
  require?: (moduleName: "electron") => ElectronPreloadApi;
};

export function loadElectronPreloadApi(): ElectronPreloadApi {
  const preloadRequire = (globalThis as PreloadGlobal).require;

  if (typeof preloadRequire !== "function") {
    throw new Error("Electron preload require is unavailable.");
  }

  const electron = preloadRequire("electron");

  if (!electron?.contextBridge || !electron?.ipcRenderer) {
    throw new Error("Electron preload bridge APIs are unavailable.");
  }

  return electron;
}
