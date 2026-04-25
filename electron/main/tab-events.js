'use strict';

// Attach all BrowserView/WebContents event wiring for a single Canva tab.
// This module exists so tab lifecycle policy can evolve without forcing the
// main entrypoint to keep every navigation and keyboard branch inline.
function attachTabEventHandlers(tab, helpers) {
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

  debugLog('view', 'attach-handlers', `tab=${tab.id}`);
  const wc = tab.view.webContents;

  wc.setWindowOpenHandler(({ url, disposition, frameName }) => {
    const openerUrl = wc.getURL();
    const request = classifyWindowOpenRequest({ url, openerUrl, disposition, frameName });
    debugLog(request.category, 'tab-window-open', `tab=${tab.id}`, `kind=${request.kind}`, url || 'about:blank', disposition || 'unknown', frameName || '');

    if (request.kind === 'oauth-popup') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: oauthHelpers.popupWindowOptions(shellBackgroundColor),
      };
    }

    if (request.kind === 'internal-tab') {
      createTab(url, { activate: disposition !== 'background-tab' });
      return { action: 'deny' };
    }

    if (request.kind === 'blocked-external') {
      debugLog('tabs:navigation', 'external-open-blocked', `tab=${tab.id}`, url || 'about:blank');
      return { action: 'deny' };
    }

    if (!isBlankPopupUrl(url) && isSafeExternalUrl(url)) {
      debugLog('tabs:navigation', 'external-open', `tab=${tab.id}`, url);
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  wc.on('did-create-window', (window, details) => {
    const openerUrl = details.referrer?.url || wc.getURL();
    const request = classifyWindowOpenRequest({
      url: details.url || 'about:blank',
      openerUrl,
      disposition: 'new-window',
      frameName: details.frameName || '',
    });
    debugLog(request.category, 'did-create-window', `tab=${tab.id}`, `kind=${request.kind}`, details.url || 'about:blank');
    oauthHelpers.registerAuthPopupWindow(window, details.url || 'about:blank', {
      shellBackgroundColor,
      sourceWebContentsId: wc.id,
      openerUrl,
    });
  });

  wc.on('will-navigate', (event, url) => {
    const request = classifyNavigationRequest({
      url,
      openerUrl: wc.getURL(),
      disposition: 'foreground-tab',
      frameName: '',
    });
    if (request.kind === 'oauth-popup') {
      debugLog('oauth', 'tab-nav-promoted-to-popup', `tab=${tab.id}`, url);
      if (isCanvaAuthUrl(wc.getURL())) {
        event.preventDefault();
        oauthHelpers.openAuthPopupForTab(url, wc.getURL(), shellBackgroundColor, wc.id);
      }
      return;
    }

    if (!isCanvaUrl(url)) {
      event.preventDefault();
      if (isSafeExternalUrl(url)) {
        debugLog('tabs:navigation', 'external-navigation-blocked', `tab=${tab.id}`, url);
        shell.openExternal(url);
      } else {
        debugLog('tabs:navigation', 'unsafe-external-navigation-blocked', `tab=${tab.id}`, url || 'about:blank');
      }
    }
  });

  const syncNavigation = () => {
    debugLog('view', 'tab-sync-navigation', `tab=${tab.id}`, wc.getURL() || tab.url);
    tab.url = wc.getURL() || tab.url;
    broadcastTabsState();

    // Ensure the eyedropper wrapper is active even if the preload failed to
    // stick during a complex Canva editor load.
    wc.executeJavaScript(`
      try {
        if (typeof ensureWrappedEyeDropperInstalled === 'function') {
          ensureWrappedEyeDropperInstalled();
        }
      } catch {}
    `).catch(() => {});
  };

  wc.on('did-navigate', syncNavigation);
  wc.on('did-navigate-in-page', syncNavigation);

  wc.on('page-title-updated', (event, title) => {
    debugLog('tabs:view', 'title-updated', `tab=${tab.id}`, title || appName);
    event.preventDefault();
    tab.title = title || appName;
    broadcastTabsState();
  });

  wc.on('page-favicon-updated', (_event, favicons) => {
    debugLog('tabs:view', 'favicon-updated', `tab=${tab.id}`, favicons?.[0] || 'none');
    tab.favicon = favicons?.[0] || null;
    broadcastTabsState();
  });

  wc.on('dom-ready', () => {
    debugLog('view', 'dom-ready', `tab=${tab.id}`, wc.getURL() || tab.url);
    wc.insertCSS(`
      html { text-rendering: optimizeLegibility; }
      body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    `).catch(() => {});
  });

  wc.on('did-frame-finish-load', (_event, isMainFrame, processId, routingId) => {
    debugLog('view', 'frame-load', `tab=${tab.id}`, isMainFrame ? 'main' : 'sub', processId, routingId);
  });

  wc.on('console-message', (_event, level, message, line, sourceId) => {
    debugLog(`tabs:view:${tab.id}`, 'console', `level=${level}`, `line=${line}`, sourceId || 'inline', message);
    if (message.includes('canva-preload') || message.includes('EyeDropper')) {
      debugLog('eyedropper:diagnostics', 'console-intercept', `tab=${tab.id}`, message);
    }
  });

  wc.on('did-finish-load', () => {
    debugLog('view', 'did-finish-load', `tab=${tab.id}`, wc.getURL());
    // Force a small delay then check if our preload successfully installed the global.
    // This is a last-resort safety for the Canva editor's complex loading cycle.
    wc.executeJavaScript(`
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

        console.log('[canva:eyedropper:check] tab=${tab.id} installed=' + installed + ' ensured=' + ensured);
      })();
    `).catch(() => {});
  });

  wc.on('before-input-event', (event, input) => {

    debugLog('app', 'before-input', `tab=${tab.id}`, input.type, input.key || '');
    const ctrlOrCmd = input.control || input.meta;
    if (!ctrlOrCmd || input.type !== 'keyDown') return;

    if (input.key.toLowerCase() === 'w') {
      event.preventDefault();
      closeTab(tab.id);
      return;
    }
    if (input.key.toLowerCase() === 't') {
      event.preventDefault();
      createTab(appUrl, { activate: true });
      return;
    }
    if (input.key === 'Tab') {
      event.preventDefault();
      switchRelativeTab(input.shift ? -1 : 1);
    }
  });
}

module.exports = {
  attachTabEventHandlers,
};
