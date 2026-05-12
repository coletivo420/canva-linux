"use strict";

// @ts-check

export type DebugLog = (category: string, ...args: unknown[]) => boolean;
export type NavigationDecision = { category: string; kind: string };
export type PreventableEvent = { preventDefault(): void };
export type WebContentsLike = {
  id: number;
  getURL(): string;
  focus(): void;
  loadURL(url: string): Promise<void> | void;
  executeJavaScript(code: string): Promise<unknown>;
  insertCSS(css: string): Promise<unknown>;
  setWindowOpenHandler(
    handler: (details: {
      url: string;
      disposition?: string;
      frameName?: string;
    }) => {
      action: "allow" | "deny";
      overrideBrowserWindowOptions?: Record<string, unknown>;
    },
  ): void;
  on(event: string, listener: (...args: any[]) => void): unknown;
};
export type TabEntry = {
  id: number;
  title: string;
  url: string;
  favicon: string | null;
  view: { webContents: WebContentsLike };
};
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

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 * @typedef {{ category: string, kind: string }} NavigationDecision
 * @typedef {{ preventDefault(): void }} PreventableEvent
 * @typedef {{
 *   id: number;
 *   getURL(): string;
 *   focus(): void;
 *   loadURL(url: string): Promise<void> | void;
 *   executeJavaScript(code: string): Promise<unknown>;
 *   insertCSS(css: string): Promise<unknown>;
 *   setWindowOpenHandler(handler: (details: { url: string, disposition?: string, frameName?: string }) => { action: 'allow' | 'deny', overrideBrowserWindowOptions?: Record<string, unknown> }): void;
 *   on(event: string, listener: (...args: any[]) => void): unknown;
 * }} WebContentsLike
 * @typedef {{ id: number, title: string, url: string, favicon: string | null, view: { webContents: WebContentsLike } }} TabEntry
 */

// Attach all BrowserView/WebContents event wiring for a single Canva tab.
// This module exists so tab lifecycle policy can evolve without forcing the
// main entrypoint to keep every navigation and keyboard branch inline.
function closeCreatedWindowIfPossible(
  window: unknown,
  debugLog: DebugLog,
): void {
  const candidate = window as { close?: () => void } | null | undefined;
  if (typeof candidate?.close !== "function") {
    debugLog("tabs", "close-created-window-unavailable");
    return;
  }

  debugLog("tabs", "close-created-window");
  candidate.close();
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
          wc.id,
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
    wc.executeJavaScript(
      `
      try {
        if (typeof ensureWrappedEyeDropperInstalled === 'function') {
          ensureWrappedEyeDropperInstalled();
        }
      } catch {}
    `,
    ).catch(() => {});
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
    wc.insertCSS(
      `
      html { text-rendering: optimizeLegibility; }
      body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    `,
    ).catch(() => {});
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
    ).catch(() => {});
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
