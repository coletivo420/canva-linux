// @ts-nocheck -- These preload modules intentionally use CommonJS/Electron globals until their runtime contracts are fully typed.

const { ipcRenderer } = require("electron");

const { createDebugTools } = require("../shared/debug");

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function normalizeEyeDropperCategoryHint(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw.startsWith("eyedropper:")) return raw;

  if (
    [
      "bridge",
      "flow",
      "wrapper",
      "routing",
      "capture",
      "library",
      "lib",
    ].includes(raw)
  ) {
    if (raw === "capture") return "eyedropper:routing";
    return `eyedropper:${raw === "lib" ? "library" : raw}`;
  }

  return null;
}

// Centralize preload-side debug routing so Canva-specific modules can emit
// diagnostics without owning the IPC transport details.
/**
 * @param {{ source?: string }} options
 */
function createPreloadDebug({ source = "preload" }) {
  /**
   * @param {string} category
   * @param {...unknown} args
   */
  function routeDebug(category, ...args) {
    try {
      ipcRenderer.send("wrapper:debug-log", { category, args, source });
    } catch {
      try {
        console.log(`[canva:${source}:${category}]`, ...args);
      } catch {}
    }
  }

  const { debugEnabled, debugLog } = createDebugTools({
    emit(category, args) {
      routeDebug(category, ...args);
    },
  });

  /**
   * @param {...unknown} args
   */
  function logEyeDropper(...args) {
    let category = "eyedropper";
    let payload = args;
    const candidate =
      typeof args[0] === "string"
        ? normalizeEyeDropperCategoryHint(args[0])
        : null;
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

module.exports = {
  createPreloadDebug,
  normalizeEyeDropperCategoryHint,
};
