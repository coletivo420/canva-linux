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
  try {
    // Attempt ESM import first (e.g. for Vitest or non-sandboxed contexts)
    const electron = await import("electron");
    return normalizeElectronPreloadApi(electron as unknown as Partial<ElectronPreloadApi>);
  } catch {
    const preloadRequire = resolvePreloadRequire();
    if (typeof preloadRequire === "function") {
      // Electron preload boundary:
      // In sandboxed/preload contexts, Electron may expose its preload APIs through
      // the preload require bridge even when the project runtime is ESM-only.
      // This fallback must remain local to this boundary and must not be reused by
      // build, validation, packaging, tests or c420ui code.
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
