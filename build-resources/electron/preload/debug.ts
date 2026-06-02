import { ipcRenderer } from "electron";
import { createDebugTools } from "../shared/debug.js";

type PreloadDebugOptions = {
  source?: string;
};

type PreloadDebugTools = {
  debugEnabled: (category?: string) => boolean;
  debugLog: (category: string, ...args: unknown[]) => boolean;
  logEyeDropper: (...args: unknown[]) => void;
};

export function normalizeEyeDropperCategoryHint(value: unknown): string | null {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw.startsWith("eyedropper:")) return raw;

  if (["bridge", "flow", "wrapper", "routing", "capture", "library", "lib"].includes(raw)) {
    if (raw === "capture") return "eyedropper:routing";
    return `eyedropper:${raw === "lib" ? "library" : raw}`;
  }

  return null;
}

export function createPreloadDebug({ source = "preload" }: PreloadDebugOptions): PreloadDebugTools {
  function routeDebug(category: string, ...args: unknown[]): void {
    try {
      ipcRenderer.send("wrapper:debug-log", { category, args, source });
    } catch {
      try {
        console.log(`[canva:${source}:${category}]`, ...args);
      } catch {}
    }
  }

  const debugArg = process.argv.find((arg) => arg === "--debug=1" || arg === "--debug=2");
  const { debugEnabled, debugLog } = createDebugTools({
    debugLevel: debugArg === "--debug=2" ? 2 : debugArg === "--debug=1" ? 1 : 0,
    emit(category, args) {
      routeDebug(category, ...args);
    },
  });

  function logEyeDropper(...args: unknown[]): void {
    let category = "eyedropper";
    let payload = args;
    const candidate = typeof args[0] === "string" ? normalizeEyeDropperCategoryHint(args[0]) : null;
    if (candidate) {
      category = candidate;
      payload = args.slice(1);
    }
    if (!debugEnabled()) return;
    routeDebug(category, ...payload);
  }

  return {
    debugEnabled,
    debugLog,
    logEyeDropper,
  };
}
