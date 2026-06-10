import type { ContextBridge, IpcRenderer } from "electron";

type ElectronPreloadApi = {
  contextBridge: ContextBridge;
  ipcRenderer: IpcRenderer;
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

export function loadElectronPreloadApi(): ElectronPreloadApi {
  const preloadRequire = resolvePreloadRequire();
  if (typeof preloadRequire !== "function") {
    throw new Error("Electron preload require is unavailable.");
  }

  const electron = preloadRequire("electron");

  if (!electron?.contextBridge || !electron?.ipcRenderer) {
    throw new Error("Electron preload bridge APIs are unavailable.");
  }

  return electron;
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
