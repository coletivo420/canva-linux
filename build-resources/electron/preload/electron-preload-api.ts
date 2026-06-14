import type { ContextBridge, IpcRenderer } from "electron";

type ElectronPreloadApi = {
  contextBridge: ContextBridge;
  ipcRenderer: IpcRenderer;
};
type ElectronPreloadModule = Partial<ElectronPreloadApi> & {
  default?: Partial<ElectronPreloadApi>;
};

type PreloadGlobal = typeof globalThis & {
  require?: (moduleName: "electron") => ElectronPreloadApi;
  process?: {
    argv?: unknown;
    isMainFrame?: unknown;
  };
};

function resolvePreloadRequire(): PreloadGlobal["require"] | undefined {
  const globalRequire = (globalThis as PreloadGlobal).require;
  if (typeof globalRequire === "function") return globalRequire;

  try {
    return (0, eval)("require") as PreloadGlobal["require"] | undefined;
  } catch {
    return undefined;
  }
}

function normalizeElectronPreloadApi(electron: ElectronPreloadModule): ElectronPreloadApi {
  const api = electron.contextBridge && electron.ipcRenderer
    ? electron
    : electron.default;
  if (!api?.contextBridge || !api?.ipcRenderer) {
    throw new Error("Electron preload bridge APIs are unavailable.");
  }

  return {
    contextBridge: api.contextBridge,
    ipcRenderer: api.ipcRenderer,
  };
}

export async function loadElectronPreloadApi(): Promise<ElectronPreloadApi> {
  try {
    const electron = await import("electron");
    return normalizeElectronPreloadApi(electron as unknown as ElectronPreloadModule);
  } catch {
    const preloadRequire = resolvePreloadRequire();
    if (typeof preloadRequire === "function") {
      return normalizeElectronPreloadApi(preloadRequire("electron"));
    }
    throw new Error("Electron preload bridge APIs are unavailable.");
  }
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
