'use strict';

function createLoggingHelpers({
  getMainWindow,
  getAuthPopups,
  getFindTabByWebContents,
}) {
  function summarizeOauthEntry(entry) {
    if (!entry) return 'popup=unknown';

    return [
      `popup=${entry.id}`,
      `startedOnCanvaAuth=${entry.startedOnCanvaAuth ? 'true' : 'false'}`,
      `sawExternalProvider=${entry.sawExternalProvider ? 'true' : 'false'}`,
      `source=${entry.sourceWebContentsId || 'unknown'}`,
    ].join(' ');
  }

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

    return `wc-${webContents.id}`;
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
