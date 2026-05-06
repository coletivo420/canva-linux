'use strict';

type WebContentsLike = {
  id?: number;
  getURL?: () => string;
  isDestroyed?: () => boolean;
};

type BrowserWindowLike = {
  id?: number;
  webContents?: WebContentsLike;
  isDestroyed?: () => boolean;
};

type OAuthPopupEntry = {
  id: number;
  window?: BrowserWindowLike;
  sourceWebContentsId?: number | null;
  startedOnCanvaAuth?: boolean;
  sawExternalProvider?: boolean;
  sawAuthorizedCallback?: boolean;
  completionHandled?: boolean;
  closeReason?: string;
};

type TabEntryLike = { id: number };
type FindTabByWebContents = (webContents: WebContentsLike) => TabEntryLike | null | undefined;

function createLoggingHelpers({
  getMainWindow,
  getAuthPopups,
  getFindTabByWebContents,
}: {
  getMainWindow: () => BrowserWindowLike | null | undefined;
  getAuthPopups: () => Map<number, OAuthPopupEntry>;
  getFindTabByWebContents: () => FindTabByWebContents | null | undefined;
}) {
  function summarizeOauthEntry(entry: OAuthPopupEntry | null | undefined): string {
    if (!entry) return 'popup=unknown';

    return [
      `popup=${entry.id}`,
      `startedOnCanvaAuth=${entry.startedOnCanvaAuth ? 'true' : 'false'}`,
      `sawExternalProvider=${entry.sawExternalProvider ? 'true' : 'false'}`,
      `source=${entry.sourceWebContentsId || 'unknown'}`,
    ].join(' ');
  }

  function windowLabel(window: BrowserWindowLike | null | undefined): string {
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

  function webContentsLabel(webContents: WebContentsLike | null | undefined): string {
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

export {
  createLoggingHelpers,
};

export type {
  BrowserWindowLike,
  OAuthPopupEntry,
  WebContentsLike,
};
