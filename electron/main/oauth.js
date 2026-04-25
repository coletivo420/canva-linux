'use strict';

function createOAuthHelpers({
  appIconPath,
  appName,
  authPopups,
  getActiveTab,
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
}) {
  function closeAuthPopup(popupId, { reloadActiveTab = true, reason = 'manual-close' } = {}) {
    const entry = authPopups.get(popupId);
    if (entry) {
      entry.closeReason = reason;
      entry.allowClose = true;
    }
    debugLog('oauth', 'close-popup', popupId, `reload=${reloadActiveTab}`, `reason=${reason}`, summarizeOauthEntry(entry));
    if (!entry) return;
    authPopups.delete(popupId);

    if (!entry.window.isDestroyed()) {
      entry.window.destroy();
    }

    if (reloadActiveTab) {
      const activeTab = getActiveTab();
      debugLog('oauth', 'reload-active-tab-after-popup', popupId, activeTab ? `tab=${activeTab.id}` : 'tab=none');
      activeTab?.view.webContents.reload();
    }

    mainWindowRef()?.focus();
  }

  function setAuthPopupTitle(window) {
    if (!window || window.isDestroyed()) return;
    window.setTitle(`${appName} — Login`);
  }

  function popupWindowOptions(shellBackgroundColor) {
    return {
      width: 520,
      height: 760,
      minWidth: 420,
      minHeight: 560,
      title: `${appName} — Login`,
      autoHideMenuBar: true,
      show: true,
      backgroundColor: shellBackgroundColor(),
      icon: appIconPath,
      webPreferences: sharedWebPreferences(),
    };
  }

  function registerAuthPopupWindow(window, startUrl, options) {
    const popupId = nextPopupIdRef();
    const { openerUrl = '', sourceWebContentsId = null } = options;
    const popupSessionPartition = window.webContents?.session?.partition || 'unknown';
    const sameAsCanvaSession = window.webContents?.session === getCanvaSession();
    const popupOptionsSummary = {
      partition: popupSessionPartition,
      contextIsolation: Boolean(window.webContents?.getLastWebPreferences()?.contextIsolation),
      nodeIntegration: Boolean(window.webContents?.getLastWebPreferences()?.nodeIntegration),
      sandbox: Boolean(window.webContents?.getLastWebPreferences()?.sandbox),
    };
    const entry = {
      id: popupId,
      window,
      startedOnCanvaAuth: isCanvaAuthUrl(startUrl) || isCanvaAuthUrl(openerUrl),
      sawExternalProvider: isOAuthProviderUrl(startUrl),
      sawAuthorizedCallback: false,
      completionHandled: false,
      pendingCallbackUrl: '',
      allowClose: false,
      closeReason: 'unknown',
      sourceWebContentsId,
    };
    authPopups.set(popupId, entry);

    debugLog('oauth', 'popup-created', summarizeOauthEntry(entry), startUrl || 'about:blank', `opener=${openerUrl || 'unknown'}`);
    debugLog('oauth', 'popup-options', `popup=${popupId}`, JSON.stringify(popupOptionsSummary));
    debugLog('oauth', `popup-session-same-as-canva=${sameAsCanvaSession ? 'true' : 'false'}`, `popup=${popupId}`);
    if (popupSessionPartition && popupSessionPartition !== 'unknown') {
      debugLog('oauth', 'popup-session-partition', `popup=${popupId}`, popupSessionPartition);
    }

    window.setMenuBarVisibility(false);
    setAuthPopupTitle(window);
    window.show();
    debugLog('oauth', 'popup-show', `popup=${popupId}`);
    window.focus();
    debugLog('oauth', 'popup-focus', `popup=${popupId}`);
    debugLog('oauth', 'popup-bounds', `popup=${popupId}`, JSON.stringify(window.getBounds()));
    window.once('ready-to-show', () => {
      debugLog('oauth', 'popup-ready-to-show', `popup=${popupId}`, windowLabel(window));
      window.show();
      debugLog('oauth', 'popup-show', `popup=${popupId}`);
      window.focus();
      debugLog('oauth', 'popup-focus', `popup=${popupId}`);
      debugLog('oauth', 'popup-bounds', `popup=${popupId}`, JSON.stringify(window.getBounds()));
    });
    window.on('close', () => {
      if (!entry.allowClose && !entry.completionHandled) {
        entry.closeReason = 'closed-before-callback';
        debugLog('oauth', 'popup-close-before-callback', `popup=${popupId}`);
        return;
      }
      if (!entry.closeReason || entry.closeReason === 'unknown') {
        entry.closeReason = entry.completionHandled ? 'auth-complete' : 'user-or-provider-close';
      }
    });
    window.on('closed', () => {
      debugLog('oauth', 'popup-closed', summarizeOauthEntry(entry), `reason=${entry.closeReason || 'unknown'}`);
      authPopups.delete(popupId);
      mainWindowRef()?.focus();
    });

    const wc = window.webContents;

    wc.on('did-finish-load', () => {
      const loadedUrl = wc.getURL() || startUrl || 'about:blank';
      debugLog('oauth', 'popup-finish-load', `popup=${popupId}`, loadedUrl);
      if (entry.sawAuthorizedCallback && entry.pendingCallbackUrl === loadedUrl && !entry.completionHandled) {
        entry.completionHandled = true;
        flushSession(getCanvaSession())
          .catch(() => {})
          .finally(() => {
            debugLog('oauth', 'popup-authorized-callback', `popup=${popupId}`, loadedUrl);
            closeAuthPopup(popupId, { reloadActiveTab: true, reason: 'authorized-callback-loaded' });
          });
      }
    });

    wc.on('page-favicon-updated', (_event, favicons) => {
      debugLog('oauth', 'popup-favicon-updated', `popup=${popupId}`, favicons?.[0] || 'none');
    });

    wc.on('page-title-updated', (event, title) => {
      debugLog('oauth', 'popup-title-updated', `popup=${popupId}`, title || appName);
      event.preventDefault();
      setAuthPopupTitle(window);
    });

    wc.setWindowOpenHandler(({ url, openerUrl: childOpenerUrl, disposition, frameName }) => {
      const request = classifyNavigationRequest({
        url,
        openerUrl: childOpenerUrl || wc.getURL(),
        disposition,
        frameName,
      });
      debugLog(request.kind === 'oauth-popup' ? 'oauth' : 'tabs', 'popup-window-open', `popup=${popupId}`, `kind=${request.kind}`, url || 'about:blank', disposition || 'unknown', frameName || '');
      if (request.kind === 'oauth-popup' || isCanvaUrl(url)) {
        window.focus();
        if (!isBlankPopupUrl(url)) {
          window.loadURL(url);
        }
        return { action: 'deny' };
      }
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      } else {
        debugLog('oauth', 'popup-unsafe-external-blocked', `popup=${popupId}`, url || 'about:blank');
      }
      return { action: 'deny' };
    });

    wc.on('will-navigate', (event, url) => {
      debugLog('oauth', 'popup-will-navigate', `popup=${popupId}`, url);
      if (isOAuthProviderUrl(url) || isCanvaUrl(url) || isBlankPopupUrl(url)) {
        return;
      }
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url);
      } else {
        debugLog('oauth', 'popup-unsafe-navigation-blocked', `popup=${popupId}`, url || 'about:blank');
      }
    });

    const syncPopupState = async (url) => {
      if (isOAuthProviderUrl(url)) {
        entry.sawExternalProvider = true;
        debugLog('oauth', 'popup-provider-seen', `popup=${popupId}`, extractHostname(url) || 'unknown-provider-host');
        return;
      }

      const callbackType = detectCanvaOAuthCallback(url);
      if (!callbackType) return;

      debugLog('oauth', 'popup-canva-callback-detected', `popup=${popupId}`, `type=${callbackType}`, url);
      if (callbackType === 'authorized') {
        entry.sawAuthorizedCallback = true;
        entry.pendingCallbackUrl = url;
        return;
      }

      entry.pendingCallbackUrl = url;
    };

    wc.on('did-navigate', (_event, url) => {
      debugLog('oauth', 'popup-did-navigate', `popup=${popupId}`, url);
      syncPopupState(url).catch(() => {});
    });
    wc.on('will-redirect', (_event, url, isInPlace, isMainFrame) => {
      debugLog('oauth', 'popup-will-redirect', `popup=${popupId}`, `mainFrame=${isMainFrame ? 'true' : 'false'}`, `inPlace=${isInPlace ? 'true' : 'false'}`, url);
    });
    wc.on('did-redirect-navigation', (_event, url) => {
      debugLog('oauth', 'popup-did-redirect-navigation', `popup=${popupId}`, url);
      syncPopupState(url).catch(() => {});
    });
    wc.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
      debugLog('oauth', 'popup-did-fail-load', `popup=${popupId}`, `mainFrame=${isMainFrame ? 'true' : 'false'}`, `code=${code}`, description || 'no-description', validatedURL || 'unknown-url');
    });
    wc.on('render-process-gone', (_event, details) => {
      debugLog('oauth', 'popup-render-process-gone', `popup=${popupId}`, `reason=${details?.reason || 'unknown'}`, `exitCode=${details?.exitCode ?? 'unknown'}`);
    });
    wc.on('unresponsive', () => {
      debugLog('oauth', 'popup-unresponsive', `popup=${popupId}`);
    });
    wc.on('responsive', () => {
      debugLog('oauth', 'popup-responsive', `popup=${popupId}`);
    });

    return entry;
  }

  function openAuthPopupForTab(url, openerUrl, shellBackgroundColor, sourceWebContentsId) {
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

module.exports = {
  createOAuthHelpers,
};
