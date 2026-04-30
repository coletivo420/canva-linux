'use strict';

// @ts-check

/**
 * @typedef {{
 *   id?: number;
 *   getURL?: () => string;
 *   isDestroyed?: () => boolean;
 * }} WebContentsLike
 */

/**
 * @typedef {{
 *   id?: number;
 *   webContents?: WebContentsLike;
 *   isDestroyed?: () => boolean;
 * }} BrowserWindowLike
 */

/**
 * @typedef {{
 *   id: number;
 *   window?: BrowserWindowLike;
 *   sourceWebContentsId?: number | null;
 *   startedOnCanvaAuth?: boolean;
 *   sawExternalProvider?: boolean;
 *   sawAuthorizedCallback?: boolean;
 *   completionHandled?: boolean;
 *   closeReason?: string;
 * }} OAuthPopupEntry
 */

/**
 * @typedef {{ id: number }} TabEntryLike
 */

/**
 * @param {{
 *   getMainWindow: () => BrowserWindowLike | null | undefined;
 *   getAuthPopups: () => Map<number, OAuthPopupEntry>;
 *   getFindTabByWebContents: () => ((webContents: WebContentsLike) => TabEntryLike | null | undefined) | null | undefined;
 * }} options
 */
function createLoggingHelpers({
  getMainWindow,
  getAuthPopups,
  getFindTabByWebContents,
}) {
  /**
   * @param {OAuthPopupEntry | null | undefined} entry
   * @returns {string}
   */
  function summarizeOauthEntry(entry) {
    if (!entry) return 'popup=unknown';

    return [
      `popup=${entry.id}`,
      `startedOnCanvaAuth=${entry.startedOnCanvaAuth ? 'true' : 'false'}`,
      `sawExternalProvider=${entry.sawExternalProvider ? 'true' : 'false'}`,
      `source=${entry.sourceWebContentsId || 'unknown'}`,
    ].join(' ');
  }

  /**
   * @param {BrowserWindowLike | null | undefined} window
   * @returns {string}
   */
  function windowLabel(window) {
    if (!window) return 'unknown-window';

    const mainWindow = getMainWindow();
    if (mainWindow && window === mainWindow) {
      return 'main-window';
    }

    for (const entry of getAuthPopups().values()) {
      if (entry.window === window) {
        return `oauth-popup-${entry.id}`;
      }
    }

    return 'window';
  }

  /**
   * @param {WebContentsLike | null | undefined} webContents
   * @returns {string}
   */
  function webContentsLabel(webContents) {
    if (!webContents) return 'unknown-webcontents';

    const findTabByWebContents = getFindTabByWebContents();
    if (typeof findTabByWebContents === 'function') {
      const tab = findTabByWebContents(webContents);
      if (tab) {
        return `tab-${tab.id}`;
      }
    }

    for (const entry of getAuthPopups().values()) {
      if (entry.window?.webContents === webContents) {
        return `oauth-popup-${entry.id}`;
      }
    }

    return `wc-${webContents.id || 'unknown'}`;
  }

  return {
    summarizeOauthEntry,
    webContentsLabel,
    windowLabel,
  };
}

module.exports = {
  createLoggingHelpers,
};
