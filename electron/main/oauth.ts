import type { DebugLog, WebContentsLike } from "../shared/types";
import type { SessionLike } from "./runtime";
export type CanvaTabEntry = {
  id: number;
  view: {
    webContents: {
      id?: number;
      getURL?(): string;
      reload(): void;
      reloadIgnoringCache?(): void;
    };
  };
};
export type OAuthPopupEntry = {
  id: number;
  window: BrowserWindowLike;
  startedOnCanvaAuth: boolean;
  sawExternalProvider: boolean;
  sawAuthorizedCallback: boolean;
  completionHandled: boolean;
  pendingCallbackUrl: string;
  allowClose: boolean;
  closeReason: string;
  sourceWebContentsId: number | null;
};
export type AuthPopupMap = Map<number, OAuthPopupEntry>;
export type { SessionLike } from "./runtime";
export type BrowserWindowLike = {
  webContents: WebContentsLike;
  isDestroyed(): boolean;
  destroy(): void;
  focus(): void;
  show(): void;
  loadURL(url: string): Promise<void> | void;
  setTitle(title: string): void;
  setMenuBarVisibility(visible: boolean): void;
  setBackgroundColor(color: string): void;
  getBounds(): Record<string, number>;
  once(event: string, listener: (...args: any[]) => void): unknown;
  on(event: string, listener: (...args: any[]) => void): unknown;
};
export type CloseAuthPopupOptions = {
  reloadSourceTab?: boolean;
  reason?: string;
};
export type RegisterAuthPopupOptions = {
  openerUrl?: string;
  shellBackgroundColor?: () => string;
  sourceWebContentsId?: number | null;
};

const CANVA_COOKIE_SUMMARY_URL = "https://www.canva.com";
const POST_OAUTH_SESSION_FLUSH_DELAY_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SENSITIVE_OAUTH_LOG_PARAMS = new Set([
  "access_token",
  "auth_token",
  "authorization",
  "client_secret",
  "code",
  "credential",
  "id_token",
  "password",
  "refresh_token",
  "session_state",
  "state",
  "token",
]);

function redactSensitiveUrlParams(url: string): string {
  try {
    const parsed = new URL(url);

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_OAUTH_LOG_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, "[redacted]");
      }
    }

    if (parsed.hash.includes("=")) {
      const hashParams = new URLSearchParams(parsed.hash.slice(1));
      let redactedHash = false;

      for (const key of Array.from(hashParams.keys())) {
        if (SENSITIVE_OAUTH_LOG_PARAMS.has(key.toLowerCase())) {
          hashParams.set(key, "[redacted]");
          redactedHash = true;
        }
      }

      if (redactedHash) {
        parsed.hash = hashParams.toString();
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

type CreateOAuthPopupInitialStateOptions = {
  popupId: number;
  window: BrowserWindowLike;
  startUrl: string;
  openerUrl: string;
  sourceWebContentsId: number | null;
  isCanvaAuthUrl: (url: string) => boolean;
  isOAuthProviderUrl: (url: string) => boolean;
};
type CreateOAuthHelpersOptions = {
  appIconPath: string;
  appName: string;
  authPopups: AuthPopupMap;
  getActiveTab: () => CanvaTabEntry | undefined;
  getSourceTabByWebContentsId?: (
    sourceWebContentsId: number | null,
  ) => CanvaTabEntry | undefined;
  BrowserWindow: new (options: Record<string, unknown>) => BrowserWindowLike;
  classifyNavigationRequest: (input: {
    url?: string;
    openerUrl?: string;
    disposition?: string;
    frameName?: string;
  }) => { kind: string; url?: string };
  debugLog: DebugLog;
  detectCanvaOAuthCallback: (url: string) => "authorized" | "oauth" | null;
  extractHostname: (urlish: string) => string;
  flushSession: (session: SessionLike) => Promise<void>;
  getCanvaSession: () => SessionLike;
  isBlankPopupUrl: (url: string) => boolean;
  isCanvaAuthUrl: (url: string) => boolean;
  isCanvaUrl: (url: string) => boolean;
  isOAuthProviderUrl: (url: string) => boolean;
  isSafeExternalUrl: (url: string) => boolean;
  mainWindowRef: () => { focus(): void } | null;
  nextPopupIdRef: () => number;
  shell: { openExternal(url: string): Promise<void> | void };
  sharedWebPreferences: (
    extra?: Record<string, unknown>,
  ) => Record<string, unknown>;
  summarizeOauthEntry: (entry: OAuthPopupEntry | undefined) => string;
  windowLabel: (window: BrowserWindowLike) => string;
};

/**
 * @param {{
 *   popupId: number;
 *   window: BrowserWindowLike;
 *   startUrl: string;
 *   openerUrl: string;
 *   sourceWebContentsId: number | null;
 *   isCanvaAuthUrl: (url: string) => boolean;
 *   isOAuthProviderUrl: (url: string) => boolean;
 * }} options
 * @returns {OAuthPopupEntry}
 */
export function createOAuthPopupInitialState({
  popupId,
  window,
  startUrl,
  openerUrl,
  sourceWebContentsId,
  isCanvaAuthUrl,
  isOAuthProviderUrl,
}: CreateOAuthPopupInitialStateOptions): OAuthPopupEntry {
  return {
    id: popupId,
    window,
    startedOnCanvaAuth: isCanvaAuthUrl(startUrl) || isCanvaAuthUrl(openerUrl),
    sawExternalProvider: isOAuthProviderUrl(startUrl),
    sawAuthorizedCallback: false,
    completionHandled: false,
    pendingCallbackUrl: "",
    allowClose: false,
    closeReason: "unknown",
    sourceWebContentsId,
  };
}

/**
 * @param {BrowserWindowLike} window
 * @returns {{ partition: string; contextIsolation: boolean; nodeIntegration: boolean; sandbox: boolean }}
 */
export function createOAuthPopupOptionsSummary(window: BrowserWindowLike): {
  partition: string;
  contextIsolation: boolean;
  nodeIntegration: boolean;
  sandbox: boolean;
} {
  const prefs = window.webContents.getLastWebPreferences?.();

  return {
    partition: window.webContents.session?.partition || "unknown",
    contextIsolation: Boolean(prefs?.contextIsolation),
    nodeIntegration: Boolean(prefs?.nodeIntegration),
    sandbox: Boolean(prefs?.sandbox),
  };
}

/**
 * @param {{
 *   appIconPath: string;
 *   appName: string;
 *   authPopups: AuthPopupMap;
 *   getActiveTab: () => CanvaTabEntry | undefined;
 *   getSourceTabByWebContentsId?: (sourceWebContentsId: number | null) => CanvaTabEntry | undefined;
 *   BrowserWindow: new (options: Record<string, unknown>) => BrowserWindowLike;
 *   classifyNavigationRequest: (input: { url?: string; openerUrl?: string; disposition?: string; frameName?: string }) => { kind: string; url?: string };
 *   debugLog: DebugLog;
 *   detectCanvaOAuthCallback: (url: string) => 'authorized' | 'oauth' | null;
 *   extractHostname: (urlish: string) => string;
 *   flushSession: (session: unknown) => Promise<void>;
 *   getCanvaSession: () => unknown;
 *   isBlankPopupUrl: (url: string) => boolean;
 *   isCanvaAuthUrl: (url: string) => boolean;
 *   isCanvaUrl: (url: string) => boolean;
 *   isOAuthProviderUrl: (url: string) => boolean;
 *   isSafeExternalUrl: (url: string) => boolean;
 *   mainWindowRef: () => { focus(): void } | null;
 *   nextPopupIdRef: () => number;
 *   shell: { openExternal(url: string): Promise<void> | void };
 *   sharedWebPreferences: (extra?: Record<string, unknown>) => Record<string, unknown>;
 *   summarizeOauthEntry: (entry: OAuthPopupEntry | undefined) => string;
 *   windowLabel: (window: BrowserWindowLike) => string;
 * }} options
 */
export function createOAuthHelpers({
  appIconPath,
  appName,
  authPopups,
  getActiveTab,
  getSourceTabByWebContentsId = () => undefined,
  BrowserWindow,
  classifyNavigationRequest,
  debugLog,
  detectCanvaOAuthCallback,
  extractHostname,
  flushSession,
  getCanvaSession,
  isBlankPopupUrl,
  isCanvaAuthUrl,
  isCanvaUrl,
  isOAuthProviderUrl,
  isSafeExternalUrl,
  mainWindowRef,
  nextPopupIdRef,
  shell,
  sharedWebPreferences,
  summarizeOauthEntry,
  windowLabel,
}: CreateOAuthHelpersOptions) {
  function resolveOAuthSourceTab(entry: OAuthPopupEntry): {
    fallback: boolean;
    sourceTab: CanvaTabEntry | undefined;
  } {
    const resolvedSourceTab = getSourceTabByWebContentsId(
      entry.sourceWebContentsId,
    );
    const fallback = !resolvedSourceTab;
    const sourceTab = resolvedSourceTab ?? getActiveTab();

    debugLog(
      "oauth",
      "oauth-source-tab-resolved",
      `popup=${entry.id}`,
      `sourceWebContentsId=${entry.sourceWebContentsId ?? "null"}`,
      sourceTab ? `tab=${sourceTab.id}` : "tab=none",
      `fallback=${fallback ? "true" : "false"}`,
    );

    return { fallback, sourceTab };
  }

  async function logCanvaCookieSummary(session: SessionLike): Promise<void> {
    if (!session.cookies.get) {
      debugLog(
        "oauth",
        "oauth-cookie-summary-unavailable",
        `url=${CANVA_COOKIE_SUMMARY_URL}`,
      );
      return;
    }

    try {
      const cookies = await session.cookies.get({
        url: CANVA_COOKIE_SUMMARY_URL,
      });
      const sessionCookies = cookies.filter((cookie) => cookie.session).length;
      const persistentCookies = cookies.length - sessionCookies;
      const secureCookies = cookies.filter((cookie) => cookie.secure).length;
      const httpOnlyCookies = cookies.filter((cookie) => cookie.httpOnly).length;

      debugLog(
        "oauth",
        "oauth-cookie-summary",
        `url=${CANVA_COOKIE_SUMMARY_URL}`,
        `count=${cookies.length}`,
        `persistent=${persistentCookies}`,
        `session=${sessionCookies}`,
        `secure=${secureCookies}`,
        `httpOnly=${httpOnlyCookies}`,
      );
    } catch (error) {
      debugLog("oauth", "oauth-cookie-summary-error", String(error));
    }
  }

  function reloadOAuthSourceTab(entry: OAuthPopupEntry, reason: string): void {
    const { sourceTab } = resolveOAuthSourceTab(entry);

    if (!sourceTab) {
      debugLog(
        "oauth",
        "reload-source-tab-after-oauth",
        `popup=${entry.id}`,
        "tab=none",
        "mode=none",
        `reason=${reason}`,
      );
      return;
    }

    const url = sourceTab.view.webContents.getURL?.() || "unknown";
    const reloadIgnoringCache = sourceTab.view.webContents.reloadIgnoringCache;
    const mode = reloadIgnoringCache ? "reloadIgnoringCache" : "reload";

    debugLog(
      "oauth",
      "reload-source-tab-after-oauth",
      `popup=${entry.id}`,
      `tab=${sourceTab.id}`,
      `mode=${mode}`,
      `url=${redactSensitiveUrlParams(url)}`,
      `reason=${reason}`,
    );

    if (reloadIgnoringCache) {
      reloadIgnoringCache.call(sourceTab.view.webContents);
    } else {
      sourceTab.view.webContents.reload();
    }
  }

  function closeAuthPopupWindow(popupId: number, reason: string): void {
    const entry = authPopups.get(popupId);
    if (entry) {
      entry.closeReason = reason;
      entry.allowClose = true;
    }
    debugLog(
      "oauth",
      "close-popup",
      popupId,
      `reason=${reason}`,
      summarizeOauthEntry(entry),
    );
    if (!entry) return;
    authPopups.delete(popupId);

    if (!entry.window.isDestroyed()) {
      entry.window.destroy();
    }

    mainWindowRef()?.focus();
  }

  async function finalizeAuthorizedOAuthCallback(
    entry: OAuthPopupEntry,
    loadedUrl: string,
  ): Promise<void> {
    if (entry.completionHandled) {
      debugLog(
        "oauth",
        "authorized-callback-ignored-already-handled",
        `popup=${entry.id}`,
        redactSensitiveUrlParams(loadedUrl),
      );
      return;
    }

    entry.completionHandled = true;
    debugLog(
      "oauth",
      "oauth-finalize-authorized-callback-start",
      `popup=${entry.id}`,
      redactSensitiveUrlParams(loadedUrl),
    );

    const canvaSession = getCanvaSession();
    try {
      await flushSession(canvaSession);
      debugLog("session", "flush", "done", `popup=${entry.id}`);
    } catch (error) {
      debugLog("session", "flush-error", String(error));
    }

    await delay(POST_OAUTH_SESSION_FLUSH_DELAY_MS);
    await logCanvaCookieSummary(canvaSession);

    debugLog(
      "oauth",
      "popup-authorized-callback",
      `popup=${entry.id}`,
      redactSensitiveUrlParams(loadedUrl),
    );
    closeAuthPopupWindow(entry.id, "authorized-callback-loaded");
    reloadOAuthSourceTab(entry, "authorized-callback-loaded");
    debugLog(
      "oauth",
      "oauth-finalize-authorized-callback-done",
      `popup=${entry.id}`,
      redactSensitiveUrlParams(loadedUrl),
    );
  }

  /**
   * @param {number} popupId
   * @param {CloseAuthPopupOptions} [options]
   * @returns {void}
   */
  function closeAuthPopup(
    popupId: number,
    {
      reloadSourceTab = true,
      reason = "manual-close",
    }: CloseAuthPopupOptions = {},
  ): void {
    const entry = authPopups.get(popupId);
    closeAuthPopupWindow(popupId, reason);

    if (entry && reloadSourceTab) {
      reloadOAuthSourceTab(entry, reason);
    }
  }

  /**
   * @param {BrowserWindowLike | null | undefined} window
   * @returns {void}
   */
  function setAuthPopupTitle(
    window: BrowserWindowLike | null | undefined,
  ): void {
    if (!window || window.isDestroyed()) return;
    window.setTitle(`${appName} — Login`);
  }

  /**
   * @param {() => string} shellBackgroundColor
   * @returns {Record<string, unknown>}
   */
  function popupWindowOptions(
    shellBackgroundColor: () => string,
  ): Record<string, unknown> {
    return {
      width: 520,
      height: 760,
      minWidth: 420,
      minHeight: 560,
      title: `${appName} — Login`,
      autoHideMenuBar: true,
      show: false,
      backgroundColor: shellBackgroundColor(),
      icon: appIconPath,
      webPreferences: sharedWebPreferences(),
    };
  }

  /**
   * @param {BrowserWindowLike} window
   * @param {string} startUrl
   * @param {RegisterAuthPopupOptions} options
   * @returns {OAuthPopupEntry}
   */
  function registerAuthPopupWindow(
    window: BrowserWindowLike,
    startUrl: string,
    options: RegisterAuthPopupOptions,
  ): OAuthPopupEntry {
    const popupId = nextPopupIdRef();
    const { openerUrl = "", sourceWebContentsId = null } = options;
    const popupOptionsSummary = createOAuthPopupOptionsSummary(window);
    const popupSessionPartition = popupOptionsSummary.partition;
    const sameAsCanvaSession = window.webContents.session === getCanvaSession();
    const entry = createOAuthPopupInitialState({
      popupId,
      window,
      startUrl,
      openerUrl,
      sourceWebContentsId,
      isCanvaAuthUrl,
      isOAuthProviderUrl,
    });
    authPopups.set(popupId, entry);

    debugLog(
      "oauth",
      "popup-created",
      summarizeOauthEntry(entry),
      redactSensitiveUrlParams(startUrl || "about:blank"),
      `opener=${redactSensitiveUrlParams(openerUrl || "unknown")}`,
    );
    debugLog("oauth", "popup-options", `popup=${popupId}`, popupOptionsSummary);
    debugLog(
      "oauth",
      `popup-session-same-as-canva=${sameAsCanvaSession ? "true" : "false"}`,
      `popup=${popupId}`,
    );
    if (popupSessionPartition && popupSessionPartition !== "unknown") {
      debugLog(
        "oauth",
        "popup-session-partition",
        `popup=${popupId}`,
        popupSessionPartition,
      );
    }

    window.setMenuBarVisibility(false);
    setAuthPopupTitle(window);
    window.once("ready-to-show", () => {
      if (window.isDestroyed()) {
        return;
      }

      window.show();
      window.focus();
      debugLog(
        "oauth",
        "popup-ready-to-show",
        `popup=${popupId}`,
        windowLabel(window),
      );
      debugLog("oauth", "popup-ready", `popup=${popupId}`);
      debugLog("oauth", "popup-bounds", `popup=${popupId}`, window.getBounds());
    });
    window.on("close", (event?: { preventDefault?: () => void }) => {
      if (!entry.allowClose && !entry.completionHandled) {
        event?.preventDefault?.();
        entry.closeReason = "closed-before-callback";
        debugLog("oauth", "popup-close-before-callback", `popup=${popupId}`);
        return;
      }
      if (!entry.closeReason || entry.closeReason === "unknown") {
        entry.closeReason = entry.completionHandled
          ? "auth-complete"
          : "user-or-provider-close";
      }
    });
    window.on("closed", () => {
      debugLog(
        "oauth",
        "popup-closed",
        summarizeOauthEntry(entry),
        `reason=${entry.closeReason || "unknown"}`,
      );
      authPopups.delete(popupId);
      mainWindowRef()?.focus();
    });

    const wc = window.webContents;

    wc.on("did-finish-load", () => {
      const loadedUrl = wc.getURL() || startUrl || "about:blank";
      debugLog(
        "oauth",
        "popup-finish-load",
        `popup=${popupId}`,
        redactSensitiveUrlParams(loadedUrl),
      );
      if (entry.sawAuthorizedCallback && entry.pendingCallbackUrl === loadedUrl) {
        finalizeAuthorizedOAuthCallback(entry, loadedUrl).catch((error) => {
          debugLog("oauth", "finalize-authorized-callback-error", String(error));
        });
      }
    });

    wc.on("page-favicon-updated", (_event: unknown, favicons: string[]) => {
      debugLog(
        "oauth",
        "popup-favicon-updated",
        `popup=${popupId}`,
        favicons?.[0] || "none",
      );
    });

    wc.on(
      "page-title-updated",
      (event: { preventDefault(): void }, title: string) => {
        debugLog(
          "oauth",
          "popup-title-updated",
          `popup=${popupId}`,
          title || appName,
        );
        event.preventDefault();
        setAuthPopupTitle(window);
      },
    );

    wc.setWindowOpenHandler(
      ({
        url,
        openerUrl: childOpenerUrl,
        disposition,
        frameName,
      }: {
        url: string;
        openerUrl?: string;
        disposition?: string;
        frameName?: string;
      }) => {
        const request = classifyNavigationRequest({
          url,
          openerUrl: childOpenerUrl || wc.getURL(),
          disposition,
          frameName,
        });
        debugLog(
          request.kind === "oauth-popup" ? "oauth" : "tabs",
          "popup-window-open",
          `popup=${popupId}`,
          `kind=${request.kind}`,
          redactSensitiveUrlParams(url || "about:blank"),
          disposition || "unknown",
          frameName || "",
        );
        if (request.kind === "oauth-popup" || isCanvaUrl(url)) {
          window.focus();
          if (!isBlankPopupUrl(url)) {
            window.loadURL(url);
          }
          return { action: "deny" };
        }
        if (isSafeExternalUrl(url)) {
          shell.openExternal(url);
        } else {
          debugLog(
            "oauth",
            "popup-unsafe-external-blocked",
            `popup=${popupId}`,
            redactSensitiveUrlParams(url || "about:blank"),
          );
        }
        return { action: "deny" };
      },
    );

    wc.on("will-navigate", (event: { preventDefault(): void }, url: string) => {
      debugLog(
        "oauth",
        "popup-will-navigate",
        `popup=${popupId}`,
        redactSensitiveUrlParams(url),
      );
      if (isOAuthProviderUrl(url) || isCanvaUrl(url) || isBlankPopupUrl(url)) {
        return;
      }
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      } else {
        debugLog(
          "oauth",
          "popup-unsafe-navigation-blocked",
          `popup=${popupId}`,
          redactSensitiveUrlParams(url || "about:blank"),
        );
      }
    });

    /**
     * @param {string} url
     * @returns {Promise<void>}
     */
    const syncPopupState = async (url: string): Promise<void> => {
      if (isOAuthProviderUrl(url)) {
        entry.sawExternalProvider = true;
        debugLog(
          "oauth",
          "popup-provider-seen",
          `popup=${popupId}`,
          extractHostname(url) || "unknown-provider-host",
        );
        return;
      }

      const callbackType = detectCanvaOAuthCallback(url);
      if (!callbackType) return;

      debugLog(
        "oauth",
        "popup-canva-callback-detected",
        `popup=${popupId}`,
        `type=${callbackType}`,
        redactSensitiveUrlParams(url),
      );
      if (callbackType === "authorized") {
        if (entry.completionHandled) {
          debugLog(
            "oauth",
            "authorized-callback-ignored-already-handled",
            `popup=${popupId}`,
            redactSensitiveUrlParams(url),
          );
          return;
        }
        entry.sawAuthorizedCallback = true;
        entry.pendingCallbackUrl = url;
        return;
      }

      entry.pendingCallbackUrl = url;
    };

    wc.on("did-navigate", (_event: unknown, url: string) => {
      debugLog(
        "oauth",
        "popup-did-navigate",
        `popup=${popupId}`,
        redactSensitiveUrlParams(url),
      );
      syncPopupState(url).catch((error) => {
        debugLog("oauth", "sync-state-error", String(error));
      });
    });
    wc.on(
      "will-redirect",
      (
        _event: unknown,
        url: string,
        isInPlace: boolean,
        isMainFrame: boolean,
      ) => {
        debugLog(
          "oauth",
          "popup-will-redirect",
          `popup=${popupId}`,
          `mainFrame=${isMainFrame ? "true" : "false"}`,
          `inPlace=${isInPlace ? "true" : "false"}`,
          redactSensitiveUrlParams(url),
        );
      },
    );
    wc.on("did-redirect-navigation", (_event: unknown, url: string) => {
      debugLog(
        "oauth",
        "popup-did-redirect-navigation",
        `popup=${popupId}`,
        redactSensitiveUrlParams(url),
      );
      syncPopupState(url).catch((error) => {
        debugLog("oauth", "sync-state-error", String(error));
      });
    });
    wc.on(
      "did-fail-load",
      (
        _event: unknown,
        code: number,
        description: string,
        validatedURL: string,
        isMainFrame: boolean,
      ) => {
        debugLog(
          "oauth",
          "popup-did-fail-load",
          `popup=${popupId}`,
          `mainFrame=${isMainFrame ? "true" : "false"}`,
          `code=${code}`,
          description || "no-description",
          redactSensitiveUrlParams(validatedURL || "unknown-url"),
        );
      },
    );
    wc.on(
      "render-process-gone",
      (_event: unknown, details: { reason?: string; exitCode?: number }) => {
        debugLog(
          "oauth",
          "popup-render-process-gone",
          `popup=${popupId}`,
          `reason=${details?.reason || "unknown"}`,
          `exitCode=${details?.exitCode ?? "unknown"}`,
        );
      },
    );
    wc.on("unresponsive", () => {
      debugLog("oauth", "popup-unresponsive", `popup=${popupId}`);
    });
    wc.on("responsive", () => {
      debugLog("oauth", "popup-responsive", `popup=${popupId}`);
    });

    return entry;
  }

  /**
   * @param {string} url
   * @param {string} openerUrl
   * @param {() => string} shellBackgroundColor
   * @param {number | null} sourceWebContentsId
   * @returns {void}
   */
  function openAuthPopupForTab(
    url: string,
    openerUrl: string,
    shellBackgroundColor: () => string,
    sourceWebContentsId: number | null,
  ): void {
    const popup = new BrowserWindow(popupWindowOptions(shellBackgroundColor));
    registerAuthPopupWindow(popup, url, {
      openerUrl,
      shellBackgroundColor,
      sourceWebContentsId,
    });
    popup.loadURL(url);
  }

  return {
    closeAuthPopup,
    openAuthPopupForTab,
    popupWindowOptions,
    registerAuthPopupWindow,
    setAuthPopupTitle,
  };
}
