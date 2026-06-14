import type { ContextBridge, IpcRenderer } from "electron";

type ElectronPreloadApi = {
  contextBridge: ContextBridge;
  ipcRenderer: IpcRenderer;
};

type PreloadGlobal = typeof globalThis & {
  process?: {
    argv?: unknown;
    isMainFrame?: unknown;
  };
};

function normalizeElectronPreloadApi(electron: Partial<ElectronPreloadApi>): ElectronPreloadApi {
  if (!electron?.contextBridge || !electron?.ipcRenderer) {
    throw new Error("Electron preload bridge APIs are unavailable.");
  }

  return {
    contextBridge: electron.contextBridge,
    ipcRenderer: electron.ipcRenderer,
  };
}

export async function loadElectronPreloadApi(): Promise<ElectronPreloadApi> {
  const electron = await import("electron");
  return normalizeElectronPreloadApi(electron as unknown as Partial<ElectronPreloadApi>);
}

export function getPreloadArgv(): string[] {
  const argv = (globalThis as PreloadGlobal).process?.argv;
  if (!Array.isArray(argv)) return [];

  return argv.filter((arg): arg is string => typeof arg === "string");
}

export function describePreloadFrame(): "main-frame" | "sub-frame" | "unknown-frame" {
  const isMainFrame = (globalThis as PreloadGlobal).process?.isMainFrame;
  if (isMainFrame === true) return "main-frame";
  if (isMainFrame === false) return "sub-frame";
  return "unknown-frame";
}
