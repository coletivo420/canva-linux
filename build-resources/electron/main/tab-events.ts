import type { DebugLog, TabEntry } from "../shared/types.js";

export type { TabEntry, WebContentsLike } from "../shared/types.js";
export type NavigationDecision = { category: string; kind: string };
export type PreventableEvent = { preventDefault(): void };
type AttachTabEventHandlersHelpers = {
  appName: string;
  appUrl: string;
  classifyNavigationRequest: (request: {
    url: string;
    openerUrl?: string;
    disposition?: string;
    frameName?: string;
  }) => NavigationDecision;
  classifyWindowOpenRequest: (request: {
    url: string;
    openerUrl?: string;
    disposition?: string;
    frameName?: string;
  }) => NavigationDecision;
  closeTab: (id: number) => void;
  createTab: (
    url?: string,
    options?: { activate?: boolean; isHome?: boolean },
  ) => TabEntry;
  debugLog: DebugLog;
  isBlankPopupUrl: (url: string) => boolean;
  isCanvaAuthUrl: (url: string) => boolean;
  isCanvaUrl: (url: string) => boolean;
  isSafeExternalUrl: (url: string) => boolean;
  oauthHelpers: {
    popupWindowOptions(
      shellBackgroundColor: () => string,
    ): Record<string, unknown>;
    registerAuthPopupWindow(
      window: unknown,
      url: string,
      options: Record<string, unknown>,
    ): void;
    openAuthPopupForTab(
      url: string,
      openerUrl: string,
      shellBackgroundColor: () => string,
      sourceWebContentsId: number | null,
    ): void;
  };
  shell: { openExternal?: (url: string) => unknown };
  shellBackgroundColor: () => string;
  switchRelativeTab: (step: number) => void;
  broadcastTabsState: () => void;
};
type SnapshotImageLike = {
  getSize(): { width: number; height: number };
  toDataURL(): string;
};
type SnapshotWebContentsLike = {
  capturePage(): Promise<SnapshotImageLike>;
};

// Attach all BrowserView/WebContents event wiring for a single Canva tab.
// This module exists so tab lifecycle policy can evolve without forcing the
// main entrypoint to keep every navigation and keyboard branch inline.
function closeCreatedWindowIfPossible(
  window: unknown,
  debugLog: DebugLog,
): void {
  const candidate = window as { close?: () => void } | null | undefined;
  if (typeof candidate?.close === "function") {
    debugLog("tabs", "close-created-window");
    candidate.close();
    return;
  }
  debugLog("tabs", "close-created-window-unavailable");
}

/**
 * @param {unknown} message
 * @param {unknown} sourceId
 * @returns {boolean}
 */
function isKnownUpstreamFedCmWarning(
  message: unknown,
  sourceId: unknown,
): boolean {
  if (
    !String(message || "").includes("[GSI_LOGGER]") ||
    !String(message || "").includes("FedCM")
  ) {
    return false;
  }

  try {
    return new URL(String(sourceId || "")).hostname === "static.canva.com";
  } catch {
    return false;
  }
}

function createEyeDropperFallbackScript(tabId: number): string {
  return `
    (function installCanvaLinuxEyeDropperFallback() {
      if (window.__canvaEyeDropperFallback && window.__canvaEyeDropperFallback.installed) {
        return true;
      }

      const pending = new Map();
      let nextRequestId = 1;

      function domError(name, message) {
        try {
          return new DOMException(message, name);
        } catch {
          const error = new Error(message);
          error.name = name;
          return error;
        }
      }

      function toHex(value) {
        const hex = Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0');
        return hex;
      }

      function cleanupHost(host, onKeyDown) {
        try { window.removeEventListener('keydown', onKeyDown, true); } catch {}
        try { host.remove(); } catch {}
      }

      function rejectPending(id, error) {
        const request = pending.get(String(id));
        if (!request) return;
        pending.delete(String(id));
        request.reject(error);
      }

      function resolvePending(id, payload) {
        const request = pending.get(String(id));
        if (!request) return;
        pending.delete(String(id));
        request.resolve(payload);
      }

      async function openFromSnapshot(id, snapshot) {
        const request = pending.get(String(id));
        if (!request) return false;
        if (!snapshot || typeof snapshot.dataUrl !== 'string') {
          rejectPending(id, domError('OperationError', 'The Canva window snapshot failed.'));
          return false;
        }

        const image = new Image();
        image.onload = () => {
          const cssWidth = Math.max(1, Number(snapshot.cssWidth) || window.innerWidth || image.naturalWidth || 1);
          const cssHeight = Math.max(1, Number(snapshot.cssHeight) || window.innerHeight || image.naturalHeight || 1);
          const nativeWidth = Math.max(1, Number(snapshot.width) || image.naturalWidth || cssWidth);
          const nativeHeight = Math.max(1, Number(snapshot.height) || image.naturalHeight || cssHeight);

          const host = document.createElement('div');
          host.setAttribute('data-canva-eyedropper-host', 'true');
          Object.assign(host.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '2147483647',
            cursor: 'crosshair',
            pointerEvents: 'auto',
            background: 'transparent',
          });

          const canvas = document.createElement('canvas');
          canvas.width = nativeWidth;
          canvas.height = nativeHeight;
          Object.assign(canvas.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: cssWidth + 'px',
            height: cssHeight + 'px',
            cursor: 'crosshair',
            display: 'block',
          });
          const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
          if (!context) {
            rejectPending(id, domError('OperationError', 'Failed to create the color picker canvas.'));
            return;
          }
          context.imageSmoothingEnabled = false;
          context.drawImage(image, 0, 0, nativeWidth, nativeHeight);

          const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            cleanupHost(host, onKeyDown);
            rejectPending(id, domError('AbortError', 'The operation was aborted.'));
          };
          const onClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const rect = canvas.getBoundingClientRect();
            const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * canvas.width / Math.max(1, rect.width))));
            const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * canvas.height / Math.max(1, rect.height))));
            const data = context.getImageData(x, y, 1, 1).data;
            cleanupHost(host, onKeyDown);
            resolvePending(id, { sRGBHex: '#' + toHex(data[0]) + toHex(data[1]) + toHex(data[2]) });
          };

          canvas.addEventListener('click', onClick, { once: true, capture: true });
          window.addEventListener('keydown', onKeyDown, true);
          host.appendChild(canvas);
          (document.body || document.documentElement).appendChild(host);
        };
        image.onerror = () => {
          rejectPending(id, domError('OperationError', 'Failed to load the Canva window snapshot.'));
        };
        image.src = snapshot.dataUrl;
        return true;
      }

      class WrappedEyeDropper {
        open(options = {}) {
          return new Promise((resolve, reject) => {
            const id = String(nextRequestId++);
            const signal = options && options.signal;
            if (signal && signal.aborted) {
              reject(domError('AbortError', 'The operation was aborted.'));
              return;
            }
            const abortHandler = () => {
              pending.delete(id);
              reject(domError('AbortError', 'The operation was aborted.'));
            };
            if (signal && typeof signal.addEventListener === 'function') {
              signal.addEventListener('abort', abortHandler, { once: true });
            }
            pending.set(id, { resolve, reject });
            window.location.href = 'canva-eyedropper://open?id=' + encodeURIComponent(id);
          });
        }
      }

      try {
        if (!window.__canvaNativeEyeDropper && typeof window.EyeDropper === 'function') {
          window.__canvaNativeEyeDropper = window.EyeDropper;
        }
      } catch {}

      Object.defineProperty(window, 'EyeDropper', {
        configurable: true,
        enumerable: false,
        get() {
          return WrappedEyeDropper;
        },
        set(value) {
          window.__canvaNativeEyeDropper = value;
        },
      });
      window.__canvaWrappedEyeDropper = WrappedEyeDropper;
      window.__canvaWrappedEyeDropperInstalled = true;
      window.ensureWrappedEyeDropperInstalled = function ensureWrappedEyeDropperInstalled() {
        return true;
      };
      window.__canvaIsWrappedEyeDropperInstalled = function __canvaIsWrappedEyeDropperInstalled() {
        return true;
      };
      window.__canvaEyeDropperFallback = {
        installed: true,
        openFromSnapshot,
      };
      console.log('[canva:eyedropper:fallback] installed tab=${tabId}');
      return true;
    })();
  `;
}

async function captureEyeDropperSnapshot(tab: TabEntry): Promise<Record<string, unknown>> {
  const view = tab.view as TabEntry["view"] & {
    getBounds?: () => { width: number; height: number };
  };
  const snapshotWebContents = view.webContents as typeof view.webContents &
    SnapshotWebContentsLike;
  const image = await snapshotWebContents.capturePage();
  const size = image.getSize();
  const bounds = typeof view.getBounds === "function"
    ? view.getBounds()
    : { width: size.width, height: size.height };

  return {
    dataUrl: image.toDataURL(),
    width: size.width,
    height: size.height,
    cssWidth: Math.max(1, bounds.width),
    cssHeight: Math.max(1, bounds.height),
  };
}

/**
 * @param {TabEntry} tab
 * @param {{
 *   appName: string;
 *   appUrl: string;
 *   classifyNavigationRequest: (request: { url: string, openerUrl?: string, disposition?: string, frameName?: string }) => NavigationDecision;
 *   classifyWindowOpenRequest: (request: { url: string, openerUrl?: string, disposition?: string, frameName?: string }) => NavigationDecision;
 *   closeTab: (id: number) => void;
 *   createTab: (url?: string, options?: { activate?: boolean, isHome?: boolean }) => unknown;
 *   debugLog: DebugLog;
 *   isBlankPopupUrl: (url: string) => boolean;
 *   isCanvaAuthUrl: (url: string) => boolean;
 *   isCanvaUrl: (url: string) => boolean;
 *   isSafeExternalUrl: (url: string) => boolean;
 *   oauthHelpers: {
 *     popupWindowOptions(shellBackgroundColor: () => string): Record<string, unknown>;
 *     registerAuthPopupWindow(window: unknown, url: string, options: Record<string, unknown>): void;
 *     openAuthPopupForTab(url: string, openerUrl: string, shellBackgroundColor: () => string, sourceWebContentsId: number): void;
 *   };
 *   shell: { openExternal?: (url: string) => unknown };
 *   shellBackgroundColor: () => string;
 *   switchRelativeTab: (step: number) => void;
 *   broadcastTabsState: () => void;
 * }} helpers
 * @returns {void}
 */
export function attachTabEventHandlers(
  tab: TabEntry,
  helpers: AttachTabEventHandlersHelpers,
): void {
  const {
    appName,
    appUrl,
    classifyNavigationRequest,
    classifyWindowOpenRequest,
    closeTab,
    createTab,
    debugLog,
    isBlankPopupUrl,
    isCanvaAuthUrl,
    isCanvaUrl,
    isSafeExternalUrl,
    oauthHelpers,
    shell,
    shellBackgroundColor,
    switchRelativeTab,
    broadcastTabsState,
  } = helpers;

  debugLog("view", "attach-handlers", `tab=${tab.id}`);
  const wc = tab.view.webContents;

  function installEyeDropperFallback(reason: string): void {
    wc.executeJavaScript(createEyeDropperFallbackScript(tab.id)).catch((error) => {
      debugLog(
        "eyedropper:diagnostics",
        "fallback-install-error",
        `tab=${tab.id}`,
        reason,
        String(error),
      );
    });
  }

  wc.setWindowOpenHandler(
    ({
      url,
      disposition,
      frameName,
    }: {
      url: string;
      disposition?: string;
      frameName?: string;
    }) => {
      const openerUrl = wc.getURL();
      const request = classifyWindowOpenRequest({
        url,
        openerUrl,
        disposition,
        frameName,
      });
      debugLog(
        request.category,
        "tab-window-open",
        `tab=${tab.id}`,
        `kind=${request.kind}`,
        url || "about:blank",
        disposition || "unknown",
        frameName || "",
      );

      if (request.kind === "oauth-popup") {
        return {
          action: "allow",
          overrideBrowserWindowOptions:
            oauthHelpers.popupWindowOptions(shellBackgroundColor),
        };
      }

      if (request.kind === "internal-tab") {
        createTab(url, { activate: disposition !== "background-tab" });
        return { action: "deny" };
      }

      if (request.kind === "blocked-external") {
        debugLog(
          "tabs:navigation",
          "external-open-blocked",
          `tab=${tab.id}`,
          url || "about:blank",
        );
        return { action: "deny" };
      }

      if (!isBlankPopupUrl(url) && isSafeExternalUrl(url)) {
        debugLog("tabs:navigation", "external-open", `tab=${tab.id}`, url);
        shell.openExternal?.(url);
      }
      return { action: "deny" };
    },
  );

  wc.on(
    "did-create-window",
    (
      window: unknown,
      details: { url: string; frameName: string; referrer?: { url: string } },
    ) => {
      const openerUrl = details.referrer?.url || wc.getURL();
      const request = classifyWindowOpenRequest({
        url: details.url || "about:blank",
        openerUrl,
        disposition: "new-window",
        frameName: details.frameName || "",
      });
      debugLog(
        request.category,
        "did-create-window",
        `tab=${tab.id}`,
        `kind=${request.kind}`,
        details.url || "about:blank",
      );

      if (request.kind === "oauth-popup") {
        oauthHelpers.registerAuthPopupWindow(
          window,
          details.url || "about:blank",
          {
            shellBackgroundColor,
            sourceWebContentsId: wc.id,
            openerUrl,
          },
        );
        return;
      }

      closeCreatedWindowIfPossible(window, debugLog);

      if (request.kind === "internal-tab") {
        createTab(details.url, { activate: true });
        return;
      }

      if (
        request.kind === "external-browser" &&
        !isBlankPopupUrl(details.url) &&
        isSafeExternalUrl(details.url)
      ) {
        shell.openExternal?.(details.url);
      }
    },
  );

  wc.on("will-navigate", (event: PreventableEvent, url: string) => {
    if (url.startsWith("canva-eyedropper://")) {
      event.preventDefault();
      void (async () => {
        try {
          const requestUrl = new URL(url);
          const id = requestUrl.searchParams.get("id") || "";
          debugLog("eyedropper:bridge", "fallback-open", `tab=${tab.id}`, `id=${id || "none"}`);
          const snapshot = await captureEyeDropperSnapshot(tab);
          await wc.executeJavaScript(
            `globalThis.__canvaEyeDropperFallback?.openFromSnapshot(${JSON.stringify(id)}, ${JSON.stringify(snapshot)});`,
          );
        } catch (error) {
          debugLog(
            "eyedropper:bridge",
            "fallback-open-error",
            `tab=${tab.id}`,
            error instanceof Error ? error.message : String(error),
          );
        }
      })();
      return;
    }

    const request = classifyNavigationRequest({
      url,
      openerUrl: wc.getURL(),
      disposition: "foreground-tab",
      frameName: "",
    });
    if (request.kind === "oauth-popup") {
      debugLog("oauth", "tab-nav-promoted-to-popup", `tab=${tab.id}`, url);
      if (isCanvaAuthUrl(wc.getURL())) {
        event.preventDefault();
        oauthHelpers.openAuthPopupForTab(
          url,
          wc.getURL(),
          shellBackgroundColor,
          wc.id ?? null,
        );
      }
      return;
    }

    if (!isCanvaUrl(url)) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        debugLog(
          "tabs:navigation",
          "external-navigation-blocked",
          `tab=${tab.id}`,
          url,
        );
        shell.openExternal?.(url);
      } else {
        debugLog(
          "tabs:navigation",
          "unsafe-external-navigation-blocked",
          `tab=${tab.id}`,
          url || "about:blank",
        );
      }
    }
  });

  const syncNavigation = () => {
    debugLog(
      "view",
      "tab-sync-navigation",
      `tab=${tab.id}`,
      wc.getURL() || tab.url,
    );
    tab.url = wc.getURL() || tab.url;
    broadcastTabsState();

    // Ensure the eyedropper wrapper is active even if the preload failed to
    // stick during a complex Canva editor load.
    installEyeDropperFallback("navigation");
  };

  wc.on("did-navigate", syncNavigation);
  wc.on("did-navigate-in-page", syncNavigation);

  wc.on("page-title-updated", (event: PreventableEvent, title: string) => {
    debugLog("tabs:view", "title-updated", `tab=${tab.id}`, title || appName);
    event.preventDefault();
    tab.title = title || appName;
    broadcastTabsState();
  });

  wc.on("page-favicon-updated", (_event: unknown, favicons: string[]) => {
    debugLog(
      "tabs:view",
      "favicon-updated",
      `tab=${tab.id}`,
      favicons?.[0] || "none",
    );
    tab.favicon = favicons?.[0] || null;
    broadcastTabsState();
  });

  wc.on("dom-ready", () => {
    debugLog("view", "dom-ready", `tab=${tab.id}`, wc.getURL() || tab.url);
    installEyeDropperFallback("dom-ready");
    wc.insertCSS(
      `
      html { text-rendering: optimizeLegibility; }
      body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    `,
    ).catch((error) => {
      debugLog(
        "tabs:view",
        "insert-css-error",
        `tab=${tab.id}`,
        String(error),
      );
    });
  });

  wc.on(
    "did-frame-finish-load",
    (
      _event: unknown,
      isMainFrame: boolean,
      processId: number,
      routingId: number,
    ) => {
      debugLog(
        "view",
        "frame-load",
        `tab=${tab.id}`,
        isMainFrame ? "main" : "sub",
        processId,
        routingId,
      );
    },
  );

  wc.on(
    "console-message",
    (
      event: any,
      legacyLevel: unknown,
      legacyMessage: string,
      legacyLine: unknown,
      legacySourceId: string,
    ) => {
      const level = event.level ?? legacyLevel;
      const message = event.message ?? legacyMessage;
      const lineNumber = event.lineNumber ?? legacyLine;
      const sourceId = event.sourceId ?? legacySourceId;

      debugLog(
        `tabs:console:${tab.id}`,
        "console",
        `level=${level}`,
        `line=${lineNumber}`,
        sourceId || "inline",
        message,
      );
      if (isKnownUpstreamFedCmWarning(message, sourceId)) {
        debugLog(
          "tabs:console",
          "upstream-fedcm-warning",
          `tab=${tab.id}`,
          "source=static.canva.com",
          message,
        );
      }
      if (message.includes("canva-preload") || message.includes("EyeDropper")) {
        debugLog(
          "eyedropper:diagnostics",
          "console-intercept",
          `tab=${tab.id}`,
          message,
        );
      }
    },
  );

  wc.on("did-finish-load", () => {
    debugLog("view", "did-finish-load", `tab=${tab.id}`, wc.getURL());
    // Force a small delay then check if our preload successfully installed the global.
    // This is a last-resort safety for the Canva editor's complex loading cycle.
    wc.executeJavaScript(
      `
      (function() {
        ${createEyeDropperFallbackScript(tab.id)}
        let ensured = false;
        let installed = false;

        try {
          if (typeof ensureWrappedEyeDropperInstalled === 'function') {
            ensured = ensureWrappedEyeDropperInstalled() !== false;
          }
        } catch {}

        try {
          if (typeof __canvaIsWrappedEyeDropperInstalled === 'function') {
            installed = __canvaIsWrappedEyeDropperInstalled();
          } else {
            const scope = globalThis || window;
            const ctor = scope.EyeDropper;
            const wrapped = scope.__canvaWrappedEyeDropper;
            installed = Boolean(
              scope.__canvaWrappedEyeDropperInstalled === true
              || (typeof wrapped === 'function' && ctor === wrapped)
              || (typeof ctor === 'function' && ctor.name === 'WrappedEyeDropper')
            );
          }
        } catch {}

        console.log('[canva:eyedropper:check] tab=' + ${tab.id} + ' installed=' + installed + ' ensured=' + ensured);
      })();
    `,
    ).catch((error) => {
      debugLog(
        "eyedropper:diagnostics",
        "execute-javascript-error",
        `tab=${tab.id}`,
        String(error),
      );
    });
  });

  wc.on("before-input-event", (event: PreventableEvent, input: any) => {
    debugLog(
      `tabs:input:${tab.id}`,
      "before-input",
      input.type,
      input.key || "",
    );
    const ctrlOrCmd = input.control || input.meta;
    if (!ctrlOrCmd || input.type !== "keyDown") return;

    if (input.key.toLowerCase() === "w") {
      event.preventDefault();
      closeTab(tab.id);
      return;
    }
    if (input.key.toLowerCase() === "t") {
      event.preventDefault();
      createTab(appUrl, { activate: true });
      return;
    }
    if (input.key === "Tab") {
      event.preventDefault();
      switchRelativeTab(input.shift ? -1 : 1);
    }
  });
}
