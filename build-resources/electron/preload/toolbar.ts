// Expose a tiny read-only bridge for the custom tab bar UI.
import type { IpcRendererEvent } from "electron";

import {
  getPreloadArgv,
  loadElectronPreloadApi,
} from "./electron-preload-api.js";

// This preload runs with sandbox enabled, so it cannot rely on local helper
// module loading. Keep the debug transport inline here.
function normalizeDebugCategory(category: unknown = "app"): string {
  const raw = String(category || "app")
    .trim()
    .toLowerCase()
    .replace(/\.+/g, ":")
    .replace(/\s+/g, "")
    .replace(/:+/g, ":")
    .replace(/^:+|:+$/g, "");
  return raw || "app";
}

function getDebugLevel(): number {
  const debugArg = getPreloadArgv().find(
    (arg) => arg === "--debug=1" || arg === "--debug=2",
  );
  if (debugArg === "--debug=1") return 1;
  if (debugArg === "--debug=2") return 2;
  return 0;
}

function debugEnabled(): boolean {
  return getDebugLevel() > 0;
}

let tabsStateListener:
  | ((event: IpcRendererEvent, state: unknown) => void)
  | null = null;

async function bootToolbarPreload(): Promise<void> {
  const { contextBridge, ipcRenderer } = await loadElectronPreloadApi();

  function debugLog(category: unknown, ...args: unknown[]): void {
    const normalized = normalizeDebugCategory(category);
    if (!debugEnabled()) return;
    try {
      ipcRenderer.send("wrapper:debug-log", {
        category: normalized,
        args,
        source: "toolbar-preload",
      });
    } catch {
      try {
        console.log(`[canva:toolbar-preload:${normalized}]`, ...args);
      } catch {
        // Logging must never break toolbar boot.
      }
    }
  }

  function sendToolbarAction(
    action: "switch-tab" | "close-tab" | "go-home",
    payload: Record<string, unknown> = {},
  ): void {
    debugLog("tabs:toolbar", "toolbar-send", action, JSON.stringify(payload));
    ipcRenderer.send("toolbar-action", { action, payload });
  }

  function subscribeTabsState(callback: (state: unknown) => void): void {
    if (tabsStateListener) {
      ipcRenderer.removeListener("tabs-state", tabsStateListener);
    }

    tabsStateListener = (_event, state) => {
      const toolbarState = state as
        | { tabs?: unknown[]; activeTabId?: unknown }
        | null
        | undefined;
      debugLog(
        "tabs:state",
        "toolbar-state",
        `count=${toolbarState?.tabs?.length || 0}`,
        `active=${toolbarState?.activeTabId || "none"}`,
      );
      callback(state);
    };
    ipcRenderer.on("tabs-state", tabsStateListener);
    ipcRenderer.send("toolbar-ready");
  }

  contextBridge.exposeInMainWorld("canvaTabs", {
    subscribeTabsState,
    switchTab(id: number) {
      sendToolbarAction("switch-tab", { id });
    },
    closeTab(id: number) {
      sendToolbarAction("close-tab", { id });
    },
    goHome() {
      sendToolbarAction("go-home");
    },
    getSystemTheme(): "dark" | "light" {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    },
  });

  debugLog("tabs:toolbar", "toolbar-preload-loaded");
  window.dispatchEvent(new CustomEvent("canva-tabs-bridge-ready"));

  window.addEventListener("error", (event) => {
    debugLog(
      "tabs:toolbar",
      "toolbar-window-error",
      event.message || "unknown-error",
      event.filename || "inline",
      `line=${event.lineno || 0}`,
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason =
      event?.reason instanceof Error
        ? event.reason.stack || event.reason.message
        : String(event?.reason || "unknown-rejection");
    debugLog("tabs:toolbar", "toolbar-unhandled-rejection", reason);
  });
}

void bootToolbarPreload().catch((error: unknown) => {
  console.warn("[toolbar-preload] native-bridge-unavailable", error);
});
