import type { DebugLog, WebContentsLike } from "../shared/types";
import type { SessionLike } from "./runtime";
export type CanvaTabEntry = {
  id: number;
  view: {
    webContents: {
      id?: number;
      getURL?(): string;
      getTitle?(): string;
      loadURL?(url: string): Promise<void> | void;
      reload(): void;
      reloadIgnoringCache?(): void;
      executeJavaScript?(code: string): Promise<unknown>;
      once?(event: string, listener: (...args: any[]) => void): unknown;
    };
  };
};

type PublicLandingSignals = {
  loginLinks?: number | null;
  signupLinks?: number | null;
  authButtons?: number | null;
};
export type OAuthPopupEntry = {
  id: number;
  window: BrowserWindowLike;
  startedOnCanvaAuth: boolean;
  sawExternalProvider: boolean;
  sawAuthorizedCallback: boolean;
  completionHandled: boolean;
  pendingCallbackUrl: string;
  pendingCallbackType: "authorized" | "oauth" | null;
  authorizedCallbackFallbackQueued: boolean;
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
const CANVA_CANONICAL_HOME_URL = "https://www.canva.com/";
const CANVA_LOCALIZED_LANDING_PATH_PATTERN =
  /^\/[a-z]{2}(?:[_-][a-z]{2})?(?:\/|$)/i;
export const PUBLIC_AUTH_TITLE_PATTERN =
  /(?:log\s*in|login|sign\s*in|signin|sign\s*up|signup|register|registr|entrar|cadastre|iniciar\s+sesi[oó]n|registrarse|connexion|inscription|anmelden|registrieren|accedi|iscriviti)/i;

export function publicLandingSignalsProbeScript(): string {
  return `(() => {
  const count = (selector) => document.querySelectorAll(selector).length;

  const localizedAuthButtonKeywords = [
    "log in",
    "login",
    "sign in",
    "signin",
    "sign up",
    "signup",
    "register",
    "entrar",
    "cadastre",
    "iniciar sesión",
    "registrarse",
    "connexion",
    "inscription",
    "anmelden",
    "registrieren",
    "accedi",
    "iscriviti",
  ];

  const normalized = (value) =>
    String(value || "").toLowerCase().normalize("NFKD");

  const authButtons = Array.from(
    document.querySelectorAll("button, [role='button'], a"),
  ).filter((element) => {
    const testId = normalized(element.getAttribute("data-testid"));
    const aria = normalized(element.getAttribute("aria-label"));
    const href = normalized(element.getAttribute("href"));

    return (
      testId.includes("login") ||
      testId.includes("signin") ||
      testId.includes("signup") ||
      href.includes("/login") ||
      href.includes("/signin") ||
      href.includes("/signup") ||
      href.includes("/register") ||
      localizedAuthButtonKeywords.some((keyword) => aria.includes(keyword))
    );
  }).length;

  return {
    loginLinks: count('a[href*="/login"], a[href*="/signin"]'),
    signupLinks: count('a[href*="/signup"], a[href*="/register"]'),
    authButtons,
  };
})()`;
}

/**
 * After Canva's authorized OAuth callback loads, Electron's session flush
 * resolves once Chromium has accepted the storage flush request, but the source
 * WebContents can still observe stale cookies/storage if it is reloaded in the
 * same tick as the popup callback. This settle window prevents the source tab
 * reload from racing Canva's internal storage propagation across WebContents.
 */
const DEFAULT_POST_OAUTH_SESSION_FLUSH_DELAY_MS = 1000;

/**
 * Some providers complete the callback through redirects where Electron may
 * report the authorized URL in did-navigate/did-redirect-navigation but not
 * emit a matching did-finish-load for the same literal URL. The fallback keeps
 * login completion from stalling while completionHandled prevents double reload.
 */
const DEFAULT_AUTHORIZED_CALLBACK_FALLBACK_DELAY_MS = 1000;
const DEFAULT_AUTHORIZED_CALLBACK_FALLBACK_MAX_ATTEMPTS = 3;

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

type StorageSummaryWebContents = {
  executeJavaScript?(code: string): Promise<unknown>;
};

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
  postOAuthSessionFlushDelayMs?: number;
  authorizedCallbackFallbackDelayMs?: number;
  authorizedCallbackFallbackMaxAttempts?: number;
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
    pendingCallbackType: null,
    authorizedCallbackFallbackQueued: false,
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
 *   postOAuthSessionFlushDelayMs?: number;
 *   authorizedCallbackFallbackDelayMs?: number;
 *   authorizedCallbackFallbackMaxAttempts?: number;
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
  postOAuthSessionFlushDelayMs = DEFAULT_POST_OAUTH_SESSION_FLUSH_DELAY_MS,
  authorizedCallbackFallbackDelayMs = DEFAULT_AUTHORIZED_CALLBACK_FALLBACK_DELAY_MS,
  authorizedCallbackFallbackMaxAttempts =
    DEFAULT_AUTHORIZED_CALLBACK_FALLBACK_MAX_ATTEMPTS,
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

  async function logCanvaStorageSummary(
    webContents: StorageSummaryWebContents,
    context: string,
  ): Promise<void> {
    if (!webContents.executeJavaScript) {
      debugLog(
        "oauth",
        "oauth-storage-summary-unavailable",
        `context=${context}`,
      );
      return;
    }

    try {
      const summary = await webContents.executeJavaScript(`
        (async () => {
          const safeCount = (read) => {
            try { return read(); } catch { return null; }
          };
          const indexedDbDatabases = await (async () => {
            try {
              if (!globalThis.indexedDB?.databases) return null;
              const databases = await globalThis.indexedDB.databases();
              return Array.isArray(databases) ? databases.length : null;
            } catch {
              return null;
            }
          })();
          const cacheStorageKeys = await (async () => {
            try {
              if (!globalThis.caches?.keys) return null;
              const keys = await globalThis.caches.keys();
              return Array.isArray(keys) ? keys.length : null;
            } catch {
              return null;
            }
          })();

          return {
            localStorageKeys: safeCount(() => globalThis.localStorage.length),
            sessionStorageKeys: safeCount(() => globalThis.sessionStorage.length),
            indexedDbDatabases,
            cacheStorageKeys,
          };
        })();
      `);
      const values = (summary && typeof summary === "object" ? summary : {}) as {
        cacheStorageKeys?: number | null;
        indexedDbDatabases?: number | null;
        localStorageKeys?: number | null;
        sessionStorageKeys?: number | null;
      };
      const formatCount = (value: number | null | undefined) =>
        typeof value === "number" && Number.isFinite(value)
          ? String(value)
          : "unavailable";

      debugLog(
        "oauth",
        "oauth-storage-summary",
        `context=${context}`,
        `localStorageKeys=${formatCount(values.localStorageKeys)}`,
        `sessionStorageKeys=${formatCount(values.sessionStorageKeys)}`,
        `indexedDbDatabases=${formatCount(values.indexedDbDatabases)}`,
        `cacheStorageKeys=${formatCount(values.cacheStorageKeys)}`,
      );
    } catch (error) {
      debugLog(
        "oauth",
        "oauth-storage-summary-error",
        `context=${context}`,
        String(error),
      );
    }
  }

  function normalizePublicLandingSignals(input: unknown): PublicLandingSignals {
    if (!input || typeof input !== "object") return {};
    const values = input as Record<string, unknown>;
    const count = (value: unknown): number | null =>
      typeof value === "number" && Number.isFinite(value) ? value : null;
    return {
      loginLinks: count(values.loginLinks),
      signupLinks: count(values.signupLinks),
      authButtons: count(values.authButtons),
    };
  }

  function formatPublicSignal(value: number | null | undefined): string {
    return typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "0";
  }

  async function probePublicLandingSignals(
    webContents: CanvaTabEntry["view"]["webContents"],
  ): Promise<PublicLandingSignals> {
    if (!webContents.executeJavaScript) return {};
    try {
      return normalizePublicLandingSignals(
        await webContents.executeJavaScript(publicLandingSignalsProbeScript()),
      );
    } catch {
      return {};
    }
  }

  function looksLikeLocalizedPublicLanding(
    url: string,
    title: string,
    signals: PublicLandingSignals = {},
  ): boolean {
    try {
      const parsed = new URL(url);

      if (parsed.hostname !== "www.canva.com") return false;
      if (!CANVA_LOCALIZED_LANDING_PATH_PATTERN.test(parsed.pathname)) return false;

      const titleLooksPublic = PUBLIC_AUTH_TITLE_PATTERN.test(title);
      const domLooksPublic =
        Number(signals.loginLinks ?? 0) > 0 ||
        Number(signals.signupLinks ?? 0) > 0 ||
        Number(signals.authButtons ?? 0) > 0;

      return titleLooksPublic || domLooksPublic;
    } catch {
      return false;
    }
  }

  async function logPostOAuthSourceLoad(
    entry: OAuthPopupEntry,
    sourceTab: CanvaTabEntry,
    reason: string,
  ): Promise<boolean> {
    const webContents = sourceTab.view.webContents;
    const url = webContents.getURL?.() || "unknown";
    const title = webContents.getTitle?.() || "unknown";

    debugLog(
      "oauth",
      "post-oauth-source-load",
      `popup=${entry.id}`,
      `tab=${sourceTab.id}`,
      `url=${redactSensitiveUrlParams(url)}`,
      `title=${title}`,
      `reason=${reason}`,
    );
    await logCanvaCookieSummary(getCanvaSession());
    await logCanvaStorageSummary(webContents, "post-oauth-source-load");
    const publicSignals = await probePublicLandingSignals(webContents);
    debugLog(
      "oauth",
      "oauth-public-landing-signals",
      `popup=${entry.id}`,
      `tab=${sourceTab.id}`,
      `loginLinks=${formatPublicSignal(publicSignals.loginLinks)}`,
      `signupLinks=${formatPublicSignal(publicSignals.signupLinks)}`,
      `authButtons=${formatPublicSignal(publicSignals.authButtons)}`,
    );
    const localizedPublicLanding = looksLikeLocalizedPublicLanding(
      url,
      title,
      publicSignals,
    );
    debugLog(
      "oauth",
      "post-oauth-source-load-classification",
      `popup=${entry.id}`,
      `tab=${sourceTab.id}`,
      `localizedPublicLanding=${String(localizedPublicLanding)}`,
    );
    return localizedPublicLanding;
  }

  function attachPostOAuthSourceProbe(
    entry: OAuthPopupEntry,
    sourceTab: CanvaTabEntry,
    reason: string,
  ): void {
    const webContents = sourceTab.view.webContents;
    let canonicalFallbackAttempted = false;
    const onSourceLoad = () => {
      logPostOAuthSourceLoad(entry, sourceTab, reason)
        .then((localizedPublicLanding) => {
          const url = webContents.getURL?.() || "";
          if (
            canonicalFallbackAttempted ||
            !webContents.loadURL ||
            !localizedPublicLanding
          ) {
            return;
          }

          canonicalFallbackAttempted = true;
          debugLog(
            "oauth",
            "post-oauth-canonical-home-fallback",
            `popup=${entry.id}`,
            `tab=${sourceTab.id}`,
            `from=${redactSensitiveUrlParams(url)}`,
            `to=${CANVA_CANONICAL_HOME_URL}`,
          );
          webContents.once?.("did-finish-load", () => {
            logPostOAuthSourceLoad(
              entry,
              sourceTab,
              "canonical-home-fallback",
            ).catch((error) => {
              debugLog("oauth", "post-oauth-source-load-error", String(error));
            });
          });
          webContents.loadURL(CANVA_CANONICAL_HOME_URL);
        })
        .catch((error) => {
          debugLog("oauth", "post-oauth-source-load-error", String(error));
        });
    };

    if (webContents.once) {
      webContents.once("did-finish-load", onSourceLoad);
    } else {
      debugLog(
        "oauth",
        "post-oauth-source-load-probe-unavailable",
        `popup=${entry.id}`,
        `tab=${sourceTab.id}`,
        "reason=missing-did-finish-load-listener",
      );
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

    const webContents = sourceTab.view.webContents;
    const url = webContents.getURL?.() || "unknown";
    const reloadIgnoringCache = webContents.reloadIgnoringCache;
    const mode = reloadIgnoringCache ? "reloadIgnoringCache" : "reload";

    attachPostOAuthSourceProbe(entry, sourceTab, reason);

    debugLog(
      "oauth",
      "reload-source-tab-after-oauth",
      `popup=${entry.id}`,
      `tab=${sourceTab.id}`,
      `mode=${mode}`,
      `target=current`,
      `url=${redactSensitiveUrlParams(url)}`,
      `reason=${reason}`,
    );

    if (reloadIgnoringCache) {
      reloadIgnoringCache.call(webContents);
    } else {
      webContents.reload();
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
    options: {
      loadedCallbackType: "authorized" | "oauth" | null;
      trigger:
        | "did-finish-load"
        | "fallback"
        | "popup-close-after-authorized-callback";
    },
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
      `trigger=${options.trigger}`,
      `loadedType=${options.loadedCallbackType ?? "null"}`,
      `pendingType=${entry.pendingCallbackType ?? "null"}`,
      redactSensitiveUrlParams(loadedUrl),
    );

    const canvaSession = getCanvaSession();
    try {
      await flushSession(canvaSession);
      debugLog("session", "flush", "done", `popup=${entry.id}`);
    } catch (error) {
      debugLog("session", "flush-error", String(error));
    }

    debugLog(
      "oauth",
      "oauth-post-flush-settle",
      `popup=${entry.id}`,
      `delayMs=${postOAuthSessionFlushDelayMs}`,
    );
    await delay(postOAuthSessionFlushDelayMs);
    await logCanvaCookieSummary(canvaSession);
    await logCanvaStorageSummary(
      entry.window.webContents,
      "authorized-callback-post-flush",
    );

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

  function isAuthPopupLoading(entry: OAuthPopupEntry): boolean {
    try {
      return Boolean(entry.window.webContents.isLoading?.());
    } catch {
      return false;
    }
  }

  function scheduleAuthorizedOAuthFallbackAttempt(
    entry: OAuthPopupEntry,
    url: string,
    trigger: string,
    attempt = 1,
  ): void {
    setTimeout(() => {
      if (entry.completionHandled) {
        debugLog(
          "oauth",
          "oauth-authorized-callback-fallback-skipped",
          `popup=${entry.id}`,
          "reason=already-handled",
          `attempt=${attempt}`,
          `trigger=${trigger}`,
        );
        return;
      }

      if (!authPopups.has(entry.id) || entry.window.isDestroyed()) {
        debugLog(
          "oauth",
          "oauth-authorized-callback-fallback-skipped",
          `popup=${entry.id}`,
          "reason=popup-gone",
          `attempt=${attempt}`,
          `trigger=${trigger}`,
        );
        return;
      }

      const loading = isAuthPopupLoading(entry);
      if (loading && attempt < authorizedCallbackFallbackMaxAttempts) {
        debugLog(
          "oauth",
          "oauth-authorized-callback-fallback-deferred",
          `popup=${entry.id}`,
          "reason=still-loading",
          `attempt=${attempt}`,
          `trigger=${trigger}`,
        );
        scheduleAuthorizedOAuthFallbackAttempt(entry, url, trigger, attempt + 1);
        return;
      }

      debugLog(
        "oauth",
        "oauth-authorized-callback-fallback-fired",
        `popup=${entry.id}`,
        `loading=${loading ? "true" : "false"}`,
        `attempt=${attempt}`,
        `trigger=${trigger}`,
        ...(loading ? ["reason=max-attempts"] : []),
        redactSensitiveUrlParams(url),
      );

      finalizeAuthorizedOAuthCallback(entry, url, {
        loadedCallbackType: detectCanvaOAuthCallback(url),
        trigger: "fallback",
      }).catch((error) => {
        debugLog("oauth", "finalize-authorized-callback-error", String(error));
      });
    }, authorizedCallbackFallbackDelayMs);
  }

  function queueAuthorizedOAuthFinalization(
    entry: OAuthPopupEntry,
    url: string,
    trigger: string,
  ): void {
    if (entry.authorizedCallbackFallbackQueued) {
      debugLog(
        "oauth",
        "oauth-authorized-callback-fallback-skipped",
        `popup=${entry.id}`,
        "reason=already-queued",
        `trigger=${trigger}`,
      );
      return;
    }

    entry.authorizedCallbackFallbackQueued = true;
    debugLog(
      "oauth",
      "oauth-authorized-callback-fallback-scheduled",
      `popup=${entry.id}`,
      `delayMs=${authorizedCallbackFallbackDelayMs}`,
      `maxAttempts=${authorizedCallbackFallbackMaxAttempts}`,
      `trigger=${trigger}`,
      redactSensitiveUrlParams(url),
    );

    scheduleAuthorizedOAuthFallbackAttempt(entry, url, trigger, 1);
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
        if (entry.sawAuthorizedCallback) {
          entry.closeReason = "close-after-authorized-callback";
          debugLog(
            "oauth",
            "popup-close-after-authorized-callback",
            `popup=${popupId}`,
          );
          finalizeAuthorizedOAuthCallback(
            entry,
            entry.pendingCallbackUrl || window.webContents.getURL() || startUrl,
            {
              loadedCallbackType: entry.pendingCallbackType,
              trigger: "popup-close-after-authorized-callback",
            },
          ).catch((error) => {
            debugLog("oauth", "finalize-authorized-callback-error", String(error));
          });
          return;
        }

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

      const loadedCallbackType = detectCanvaOAuthCallback(loadedUrl);
      const shouldFinalize =
        !entry.completionHandled &&
        (loadedCallbackType === "authorized" ||
          entry.pendingCallbackType === "authorized");

      if (shouldFinalize) {
        debugLog(
          "oauth",
          "oauth-authorized-callback-ready",
          `popup=${popupId}`,
          "trigger=did-finish-load",
          `loadedType=${loadedCallbackType ?? "null"}`,
          `pendingType=${entry.pendingCallbackType ?? "null"}`,
          `urlMatch=${entry.pendingCallbackUrl === loadedUrl ? "true" : "false"}`,
        );
        finalizeAuthorizedOAuthCallback(entry, loadedUrl, {
          loadedCallbackType,
          trigger: "did-finish-load",
        }).catch((error) => {
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

      entry.pendingCallbackType = callbackType;
      entry.pendingCallbackUrl = url;

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
        queueAuthorizedOAuthFinalization(
          entry,
          url,
          "authorized-callback-detected",
        );
        return;
      }
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
