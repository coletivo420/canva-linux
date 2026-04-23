'use strict';

const {
  app,
  BrowserWindow,
  WebContentsView,
  shell,
  session,
  ipcMain,
  nativeImage,
  nativeTheme,
} = require('electron');
const path = require('path');

const APP_ID = 'com.canva.WebApp';
const APP_URL = 'https://www.canva.com';
const APP_NAME = 'Canva';
const PARTITION = 'persist:canva';
const HOME_URL = APP_URL;
const TOOLBAR_HEIGHT = 46;
const WM_CLASS = APP_ID;
const INTERNAL_HOST_RE = /(?:^|\.)canva\.com$/i;
const OAUTH_PROVIDER_HOSTS = [
  /(?:^|\.)google\.com$/i,
  /(?:^|\.)googleusercontent\.com$/i,
  /(?:^|\.)gstatic\.com$/i,
  /(?:^|\.)facebook\.com$/i,
  /(?:^|\.)fbcdn\.net$/i,
  /(?:^|\.)appleid\.apple\.com$/i,
  /(?:^|\.)apple\.com$/i,
  /(?:^|\.)microsoftonline\.com$/i,
  /(?:^|\.)live\.com$/i,
  /(?:^|\.)office\.com$/i,
  /(?:^|\.)linkedin\.com$/i,
  /(?:^|\.)twitter\.com$/i,
  /(?:^|\.)x\.com$/i,
  /(?:^|\.)github\.com$/i,
  /(?:^|\.)okta\.com$/i,
  /(?:^|\.)auth0\.com$/i,
];
const PROVIDER_LABELS = [
  { re: /(?:^|\.)google\.com$/i, label: 'Google' },
  { re: /(?:^|\.)facebook\.com$/i, label: 'Facebook' },
  { re: /(?:^|\.)appleid\.apple\.com$/i, label: 'Apple' },
  { re: /(?:^|\.)microsoftonline\.com$/i, label: 'Microsoft' },
  { re: /(?:^|\.)live\.com$/i, label: 'Microsoft' },
  { re: /(?:^|\.)office\.com$/i, label: 'Microsoft' },
  { re: /(?:^|\.)linkedin\.com$/i, label: 'LinkedIn' },
  { re: /(?:^|\.)x\.com$/i, label: 'X' },
  { re: /(?:^|\.)twitter\.com$/i, label: 'X' },
  { re: /(?:^|\.)github\.com$/i, label: 'GitHub' },
  { re: /(?:^|\.)okta\.com$/i, label: 'Okta' },
  { re: /(?:^|\.)auth0\.com$/i, label: 'Auth0' },
];
const AUTH_PATH_RE = /\/(?:login|signup|register|oauth|sso|auth|signin|account)(?:[/?#]|$)/i;
const CANVA_AUTH_HINT_RE = /(?:google|facebook|apple|microsoft|oauth|sso|signup|login|continue)/i;

let mainWindow = null;
let toolbarView = null;
let activeTabId = null;
let nextTabId = 1;
let nextPopupId = 1;
const tabs = new Map();
const authPopups = new Map();

app.setName(APP_NAME);
if (process.platform === 'linux') {
  app.setDesktopName(`${APP_ID}.desktop`);
  app.commandLine.appendSwitch('class', WM_CLASS);
  app.commandLine.appendSwitch('font-render-hinting', 'medium');
  app.commandLine.appendSwitch('enable-font-antialiasing');
  // Keep the eyedropper capture path reliable across Wayland and X11 sessions.
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-compositing');
}
// Keep persistent browser data inside a stable session directory.
app.setPath('sessionData', path.join(app.getPath('userData'), 'session'));

function isCanvaUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && INTERNAL_HOST_RE.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isOauthProviderUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && OAUTH_PROVIDER_HOSTS.some((re) => re.test(parsed.hostname));
  } catch {
    return false;
  }
}

function detectOauthProviderLabel(url) {
  try {
    const hostname = new URL(url).hostname;
    return PROVIDER_LABELS.find((entry) => entry.re.test(hostname))?.label || 'Login';
  } catch {
    return 'Login';
  }
}

function isCanvaAuthUrl(url) {
  if (!isCanvaUrl(url)) return false;
  try {
    const parsed = new URL(url);
    if (AUTH_PATH_RE.test(parsed.pathname)) return true;
    const q = parsed.searchParams;
    return ['auth', 'oauth', 'provider', 'continue', 'redirect', 'redirect_uri', 'callback'].some((key) => q.has(key))
      || CANVA_AUTH_HINT_RE.test(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return false;
  }
}

function shouldOpenInOauthPopup(url) {
  return isOauthProviderUrl(url) || isCanvaAuthUrl(url);
}

function isAuthCompletionUrl(url) {
  return isCanvaUrl(url) && !isCanvaAuthUrl(url);
}

function isBlankPopupUrl(url) {
  return !url || url === 'about:blank' || url === 'about:srcdoc';
}

function shouldTreatAsOauthPopup({ url, openerUrl, disposition, frameName }) {
  if (shouldOpenInOauthPopup(url)) return true;
  if (isBlankPopupUrl(url) && isCanvaAuthUrl(openerUrl)) return true;
  if (isBlankPopupUrl(url) && frameName && /auth|oauth|login|signin|account|popup/i.test(frameName)) return true;
  if ((disposition === 'new-window' || disposition === 'foreground-tab') && isCanvaAuthUrl(openerUrl)) return true;
  return false;
}

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'canva-icon.png');
  return nativeImage.createFromPath(iconPath);
}

function createTintedProviderIcon(providerLabel) {
  const presets = {
    Google: { bg: '#ffffff', fg: '#4285F4' },
    Facebook: { bg: '#1877F2', fg: '#ffffff' },
    Apple: { bg: '#111111', fg: '#ffffff' },
    Microsoft: { bg: '#2563eb', fg: '#ffffff' },
    LinkedIn: { bg: '#0a66c2', fg: '#ffffff' },
    X: { bg: '#111111', fg: '#ffffff' },
    GitHub: { bg: '#111111', fg: '#ffffff' },
    Okta: { bg: '#007dc1', fg: '#ffffff' },
    Auth0: { bg: '#eb5424', fg: '#ffffff' },
    Login: { bg: '#00c4cc', fg: '#ffffff' },
  };
  const preset = presets[providerLabel] || presets.Login;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="56" fill="${preset.bg}"/>
      <text x="128" y="150" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="112" font-weight="700" fill="${preset.fg}">${providerLabel.slice(0, 1)}</text>
    </svg>
  `;
  return nativeImage.createFromBuffer(Buffer.from(svg));
}

async function trySetPopupIconFromFavicon(window, faviconUrl) {
  if (!window || window.isDestroyed() || !faviconUrl) return false;
  try {
    const response = await fetch(faviconUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 Canva Linux Wrapper',
      },
    });
    if (!response.ok) return false;
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const image = nativeImage.createFromBuffer(imageBuffer);
    if (image.isEmpty()) return false;
    window.setIcon(image);
    return true;
  } catch {
    return false;
  }
}

function updateAuthPopupChrome(window, url) {
  if (!window || window.isDestroyed()) return;
  const providerLabel = shouldOpenInOauthPopup(url) ? detectOauthProviderLabel(url) : 'Login';
  window.setTitle(`${providerLabel} — ${APP_NAME} Login`);
  window.setIcon(createTintedProviderIcon(providerLabel));
}

// Flush cookies and storage so OAuth and Canva sessions survive restarts.
async function flushSession(ses) {
  await ses.cookies.flushStore();
  await ses.flushStorageData();
}

// Configure the shared session used by the main view and OAuth popups.
async function configureSession() {
  const ses = session.fromPartition(PARTITION, { cache: true });
  const ALLOWED_PERMISSIONS = new Set([
    'clipboard-sanitized-write',
    'fullscreen',
    'media',
    'notifications',
    'pointerLock',
    'display-capture',
  ]);

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });

  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders.DNT = '1';
    callback({ requestHeaders: details.requestHeaders });
  });

  ses.on('will-download', (_event, item) => {
    const downloadsDir = app.getPath('downloads');
    item.setSavePath(path.join(downloadsDir, item.getFilename()));
  });

  await flushSession(ses).catch(() => {});
  return ses;
}

function makeToolbarUrl() {
  return `file://${path.join(__dirname, 'toolbar.html')}`;
}

function currentTheme() {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function shellBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#1f2329' : '#f6f7fb';
}

function sharedWebPreferences(extra = {}) {
  return {
    partition: PARTITION,
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    spellcheck: true,
    ...extra,
  };
}

function popupWindowOptions() {
  return {
    width: 520,
    height: 760,
    minWidth: 420,
    minHeight: 560,
    title: `${APP_NAME} — Login`,
    parent: mainWindow || undefined,
    modal: false,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: shellBackgroundColor(),
    icon: getAppIcon(),
    webPreferences: sharedWebPreferences(),
  };
}

function createShellWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: APP_NAME,
    autoHideMenuBar: true,
    backgroundColor: shellBackgroundColor(),
    show: false,
    icon: getAppIcon(),
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(`data:text/html,<html><body style="margin:0;background:${shellBackgroundColor()}"></body></html>`);
  mainWindow.on('resize', layoutViews);
  mainWindow.on('maximize', layoutViews);
  mainWindow.on('unmaximize', layoutViews);
  mainWindow.on('closed', () => {
    mainWindow = null;
    toolbarView = null;
  });

  return mainWindow;
}

function ensureTopLevelView(view) {
  if (!mainWindow || !view) return;
  mainWindow.contentView.addChildView(view);
}

function createToolbarView() {
  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'toolbar-preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  ensureTopLevelView(toolbarView);
  toolbarView.webContents.on('did-finish-load', () => broadcastTabsState());
  toolbarView.webContents.loadURL(makeToolbarUrl());
  layoutViews();
}

function setTabVisibility(tab, visible) {
  if (!tab?.view) return;
  tab.view.setVisible(Boolean(visible));
}

function layoutViews() {
  if (!mainWindow || !toolbarView) return;
  const [width, height] = mainWindow.getContentSize();
  toolbarView.setBounds({ x: 0, y: 0, width, height: TOOLBAR_HEIGHT });

  for (const tab of tabs.values()) {
    tab.view.setBounds({
      x: 0,
      y: TOOLBAR_HEIGHT,
      width,
      height: Math.max(0, height - TOOLBAR_HEIGHT),
    });
  }

  ensureTopLevelView(toolbarView);
}

// Return the ordered tab list used by the custom shell UI.
function getOrderedTabs() {
  return [...tabs.values()].sort((a, b) => a.createdAt - b.createdAt);
}

// Return the single fixed Home tab when it exists.
function getHomeTab() {
  return getOrderedTabs().find((tab) => tab.isHome) || null;
}

// Open the fixed Home tab and optionally reset it to the Canva home URL.
function focusHomeTab({ resetToHome = true } = {}) {
  const homeTab = getHomeTab();
  if (!homeTab) return;

  if (resetToHome && homeTab.url !== HOME_URL) {
    homeTab.view.webContents.loadURL(HOME_URL);
  }

  switchToTab(homeTab.id);
}

// Create the initial fixed Home tab.
function createHomeTab() {
  return createTab(HOME_URL, { activate: true, isHome: true });
}

function updateWindowTitle() {
  const activeTab = tabs.get(activeTabId);
  const title = activeTab?.title || APP_NAME;
  mainWindow?.setTitle(title ? `${title} - ${APP_NAME}` : APP_NAME);
}

function applyThemeToShell() {
  if (!mainWindow) return;
  mainWindow.setBackgroundColor(shellBackgroundColor());
  for (const entry of authPopups.values()) {
    if (!entry.window.isDestroyed()) {
      entry.window.setBackgroundColor(shellBackgroundColor());
    }
  }
}

function toolbarState() {
  const orderedTabs = getOrderedTabs()
    .map((tab) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favicon: tab.favicon,
      canClose: !tab.isHome,
    }));

  return {
    activeTabId,
    tabs: orderedTabs,
    theme: currentTheme(),
  };
}

function broadcastTabsState() {
  if (toolbarView && !toolbarView.webContents.isDestroyed()) {
    toolbarView.webContents.send('tabs-state', toolbarState());
  }
  updateWindowTitle();
}

function closeAuthPopup(popupId, { reloadActiveTab = true } = {}) {
  const entry = authPopups.get(popupId);
  if (!entry) return;
  authPopups.delete(popupId);

  if (!entry.window.isDestroyed()) {
    entry.window.destroy();
  }

  if (reloadActiveTab) {
    const activeTab = tabs.get(activeTabId);
    activeTab?.view.webContents.reload();
  }

  mainWindow?.focus();
}

function registerAuthPopupWindow(window, startUrl, { sourceWebContentsId = null, openerUrl = '' } = {}) {
  const popupId = nextPopupId++;
  const entry = {
    id: popupId,
    window,
    startedOnCanvaAuth: isCanvaAuthUrl(startUrl) || isCanvaAuthUrl(openerUrl),
    sawExternalProvider: isOauthProviderUrl(startUrl),
    sourceWebContentsId,
  };
  authPopups.set(popupId, entry);

  window.setMenuBarVisibility(false);
  updateAuthPopupChrome(window, startUrl || openerUrl);
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    authPopups.delete(popupId);
    mainWindow?.focus();
  });

  const wc = window.webContents;

  wc.on('page-favicon-updated', (_event, favicons) => {
    const faviconUrl = favicons?.[0];
    if (faviconUrl) {
      trySetPopupIconFromFavicon(window, faviconUrl).catch(() => {});
    }
  });

  wc.on('page-title-updated', (event, title) => {
    event.preventDefault();
    const providerLabel = detectOauthProviderLabel(wc.getURL() || startUrl || openerUrl);
    const cleanTitle = title && title.trim() ? title.trim() : providerLabel;
    window.setTitle(`${cleanTitle} — ${APP_NAME} Login`);
  });

  wc.setWindowOpenHandler(({ url, openerUrl: childOpenerUrl, disposition, frameName }) => {
    if (shouldTreatAsOauthPopup({ url, openerUrl: childOpenerUrl || wc.getURL(), disposition, frameName }) || isCanvaUrl(url)) {
      window.focus();
      if (!isBlankPopupUrl(url)) {
        updateAuthPopupChrome(window, url);
        window.loadURL(url);
      }
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  wc.on('will-navigate', (event, url) => {
    if (shouldOpenInOauthPopup(url) || isCanvaUrl(url) || isBlankPopupUrl(url)) {
      updateAuthPopupChrome(window, url);
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
  });

  const syncPopupState = async (url) => {
    updateAuthPopupChrome(window, url);

    if (isOauthProviderUrl(url)) {
      entry.sawExternalProvider = true;
      return;
    }

    if (isAuthCompletionUrl(url) && (entry.sawExternalProvider || entry.startedOnCanvaAuth)) {
      const ses = session.fromPartition(PARTITION, { cache: true });
      await flushSession(ses).catch(() => {});
      closeAuthPopup(popupId, { reloadActiveTab: true });
    }
  };

  wc.on('did-navigate', (_event, url) => {
    syncPopupState(url).catch(() => {});
  });
  wc.on('did-redirect-navigation', (_event, url) => {
    syncPopupState(url).catch(() => {});
  });

  return entry;
}

// Attach navigation, popup, and keyboard handlers to a Canva WebContentsView.
function attachViewHandlers(tab) {
  const wc = tab.view.webContents;

  wc.setWindowOpenHandler(({ url, disposition, frameName }) => {
    const openerUrl = wc.getURL();

    if (shouldTreatAsOauthPopup({ url, openerUrl, disposition, frameName })) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: popupWindowOptions(),
      };
    }

    if (isCanvaUrl(url)) {
      createTab(url, { activate: disposition !== 'background-tab' });
      return { action: 'deny' };
    }

    if (!isBlankPopupUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  wc.on('did-create-window', (window, details) => {
    registerAuthPopupWindow(window, details.url || 'about:blank', {
      sourceWebContentsId: wc.id,
      openerUrl: details.referrer?.url || wc.getURL(),
    });
  });

  wc.on('will-navigate', (event, url) => {
    if (shouldOpenInOauthPopup(url)) {
      if (isCanvaAuthUrl(wc.getURL())) {
        event.preventDefault();
        const popup = new BrowserWindow(popupWindowOptions());
        registerAuthPopupWindow(popup, url, { sourceWebContentsId: wc.id, openerUrl: wc.getURL() });
        popup.loadURL(url);
      }
      return;
    }

    if (!isCanvaUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const syncNavigation = () => {
    tab.url = wc.getURL() || tab.url;
    broadcastTabsState();
  };

  wc.on('did-navigate', syncNavigation);
  wc.on('did-navigate-in-page', syncNavigation);

  wc.on('page-title-updated', (event, title) => {
    event.preventDefault();
    tab.title = title || APP_NAME;
    broadcastTabsState();
  });

  wc.on('page-favicon-updated', (_event, favicons) => {
    tab.favicon = favicons?.[0] || null;
    broadcastTabsState();
  });

  wc.on('dom-ready', () => {
    wc.insertCSS(`
      html { text-rendering: optimizeLegibility; }
      body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
    `).catch(() => {});
  });

  wc.on('did-frame-finish-load', (_event, isMainFrame, processId, routingId) => {
    console.log('[canva-eyedropper]', 'frame-load', isMainFrame ? 'main' : 'sub', processId, routingId);
  });

  wc.on('before-input-event', (event, input) => {
    const ctrlOrCmd = input.control || input.meta;
    if (!ctrlOrCmd || input.type !== 'keyDown') return;

    if (input.key.toLowerCase() === 'w') {
      event.preventDefault();
      closeTab(tab.id);
      return;
    }
    if (input.key.toLowerCase() === 't') {
      event.preventDefault();
      createTab(APP_URL, { activate: true });
      return;
    }
    if (input.key === 'Tab') {
      event.preventDefault();
      switchRelativeTab(input.shift ? -1 : 1);
    }
  });
}

// Create a new Canva tab inside the custom shell.
function createTab(url = APP_URL, { activate = true, isHome = false } = {}) {
  const id = nextTabId++;
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'canva-preload.js'),
      contextIsolation: false,
      sandbox: false,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true,
      partition: PARTITION,
      spellcheck: true,
    },
  });

  const tab = {
    id,
    view,
    createdAt: Date.now() + id,
    title: isHome ? 'Home' : APP_NAME,
    url,
    favicon: null,
    isHome,
  };

  attachViewHandlers(tab);
  ensureTopLevelView(view);
  setTabVisibility(tab, false);
  view.webContents.loadURL(url);

  tabs.set(id, tab);
  layoutViews();

  if (activate) {
    switchToTab(id);
  } else {
    broadcastTabsState();
  }

  return tab;
}

// Hide the currently visible tab view without destroying it.
function detachActiveContentView() {
  const activeTab = tabs.get(activeTabId);
  if (activeTab) {
    setTabVisibility(activeTab, false);
  }
}

// Show a specific tab view and update the shell state.
function switchToTab(id) {
  if (!tabs.has(id) || !mainWindow) return;
  const tab = tabs.get(id);

  if (activeTabId === id) {
    tab.view.webContents.focus();
    return;
  }

  detachActiveContentView();
  ensureTopLevelView(tab.view);
  setTabVisibility(tab, true);
  activeTabId = id;
  layoutViews();
  ensureTopLevelView(toolbarView);
  tab.view.webContents.focus();
  broadcastTabsState();
}

// Cycle through tabs with keyboard shortcuts.
function switchRelativeTab(step) {
  const ordered = [...tabs.values()].sort((a, b) => a.createdAt - b.createdAt);
  if (ordered.length < 2) return;
  const currentIndex = ordered.findIndex((tab) => tab.id === activeTabId);
  if (currentIndex < 0) return;
  const nextIndex = (currentIndex + step + ordered.length) % ordered.length;
  switchToTab(ordered[nextIndex].id);
}

// Close a non-home tab and keep the shell on a valid fallback tab.
function closeTab(id) {
  const ordered = getOrderedTabs();
  const index = ordered.findIndex((tab) => tab.id === id);
  const tab = tabs.get(id);
  if (!tab || tab.isHome) return;

  if (activeTabId === id) {
    detachActiveContentView();
  }

  if (mainWindow?.contentView?.children.includes(tab.view)) {
    mainWindow.contentView.removeChildView(tab.view);
  }
  if (!tab.view.webContents.isDestroyed()) {
    tab.view.webContents.destroy();
  }
  tabs.delete(id);

  if (tabs.size === 0) {
    activeTabId = null;
    createHomeTab();
    return;
  }

  const fallback = ordered[index + 1] || ordered[index - 1] || getHomeTab();
  if (fallback) {
    switchToTab(fallback.id);
  } else {
    broadcastTabsState();
  }
}

function findTabByWebContents(webContents) {
  if (!webContents) return null;
  for (const tab of tabs.values()) {
    if (tab.view.webContents.id === webContents.id) {
      return tab;
    }
  }
  return null;
}

ipcMain.handle('wrapper:eyedropper-snapshot', async (event) => {
  const tab = findTabByWebContents(event.sender);
  if (!tab) {
    throw new Error('The active Canva tab was not found for the eyedropper snapshot.');
  }

  const bounds = tab.view.getBounds();
  const image = await tab.view.webContents.capturePage();
  const size = image.getSize();
  console.log('[canva-eyedropper]', 'snapshot', `${size.width}x${size.height}`, 'css', `${Math.max(1, bounds.width)}x${Math.max(1, bounds.height)}`);
  return {
    dataUrl: image.toDataURL(),
    width: size.width,
    height: size.height,
    cssWidth: Math.max(1, bounds.width),
    cssHeight: Math.max(1, bounds.height),
  };
});

ipcMain.on('wrapper:eyedropper-log', (_event, ...args) => {
  console.log('[canva-eyedropper]', ...args);
});

ipcMain.on('toolbar-action', (_event, { action, payload = {} }) => {
  if (action === 'switch-tab') {
    switchToTab(payload.id);
    return;
  }
  if (action === 'close-tab') {
    closeTab(payload.id);
    return;
  }
  if (action === 'go-home') {
    focusHomeTab({ resetToHome: true });
  }
});

app.whenReady().then(async () => {
  await configureSession();
  createShellWindow();
  createToolbarView();
  createHomeTab();

  nativeTheme.on('updated', () => {
    applyThemeToShell();
    broadcastTabsState();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createShellWindow();
      createToolbarView();
      createHomeTab();
    }
  });
});

app.on('window-all-closed', async () => {
  const ses = session.fromPartition(PARTITION, { cache: true });
  await flushSession(ses).catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});
