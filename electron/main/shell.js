'use strict';

function createShellHelpers({
  appIconPath,
  appName,
  BrowserWindow,
  debugLog,
  layoutViews,
  nativeTheme,
  WebContentsView,
}) {
  function shellBackgroundColor() {
    return nativeTheme.shouldUseDarkColors ? '#1f2329' : '#f6f7fb';
  }

  function createShellWindow({ setMainWindow }) {
    debugLog('app', 'create-shell-window');
    const mainWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      minWidth: 1024,
      minHeight: 680,
      title: appName,
      autoHideMenuBar: true,
      backgroundColor: shellBackgroundColor(),
      show: false,
      icon: appIconPath,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        spellcheck: true,
      },
    });

    mainWindow.once('ready-to-show', () => {
      debugLog('app', 'main-window-ready');
      mainWindow.show();
    });
    mainWindow.loadURL(`data:text/html,<html><body style="margin:0;background:${shellBackgroundColor()}"></body></html>`);
    mainWindow.on('resize', () => {
      debugLog('view', 'window-resize', ...mainWindow.getContentSize());
      layoutViews();
    });
    mainWindow.on('maximize', () => {
      debugLog('view', 'window-maximize');
      layoutViews();
    });
    mainWindow.on('unmaximize', () => {
      debugLog('view', 'window-unmaximize');
      layoutViews();
    });
    mainWindow.on('closed', () => {
      setMainWindow(null);
    });

    setMainWindow(mainWindow);
    return mainWindow;
  }

  function createToolbarView({
    broadcastTabsState,
    ensureTopLevelView,
    layoutViews,
    makeToolbarUrl,
    preloadPath,
    setToolbarView,
  }) {
    debugLog('tabs:toolbar', 'create-toolbar-view');
    const toolbarView = new WebContentsView({
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    ensureTopLevelView(toolbarView);
    toolbarView.setVisible(true);
    toolbarView.webContents.on('dom-ready', () => {
      debugLog('tabs:toolbar', 'toolbar-dom-ready', toolbarView.webContents.getURL() || 'about:blank');
    });
    toolbarView.webContents.on('did-finish-load', () => {
      debugLog('tabs:toolbar', 'toolbar-loaded', toolbarView.webContents.getURL() || 'about:blank');
      broadcastTabsState();
    });
    toolbarView.webContents.on('did-fail-load', (_event, code, description, validatedURL, isMainFrame) => {
      debugLog(
        'tabs:toolbar',
        'toolbar-fail-load',
        `mainFrame=${isMainFrame ? 'true' : 'false'}`,
        `code=${code}`,
        description || 'no-description',
        validatedURL || 'unknown-url'
      );
    });
    toolbarView.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      debugLog('tabs:toolbar', 'toolbar-console', `level=${level}`, `line=${line}`, sourceId || 'inline', message);
    });
    toolbarView.webContents.on('render-process-gone', (_event, details) => {
      debugLog('tabs:toolbar', 'toolbar-render-process-gone', `reason=${details?.reason || 'unknown'}`, `exitCode=${details?.exitCode ?? 'unknown'}`);
    });
    toolbarView.webContents.on('unresponsive', () => {
      debugLog('tabs:toolbar', 'toolbar-unresponsive');
    });
    toolbarView.webContents.on('responsive', () => {
      debugLog('tabs:toolbar', 'toolbar-responsive');
    });
    toolbarView.webContents.loadURL(makeToolbarUrl());
    setToolbarView(toolbarView);
    layoutViews();
    return toolbarView;
  }

  return {
    createShellWindow,
    createToolbarView,
    shellBackgroundColor,
  };
}

module.exports = {
  createShellHelpers,
};
