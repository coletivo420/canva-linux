'use strict';

const {
  app,
  BrowserWindow,
  WebContentsView,
  shell,
  session,
  ipcMain,
  nativeTheme,
} = require('electron');
const path = require('path');

const APP_ID = 'com.canva.WebApp';
const APP_URL = 'https://www.canva.com';
const APP_NAME = 'Canva';
const APP_VERSION = require('../package.json').version;
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
const AUTH_PATH_RE = /\/(?:login|signup|register|oauth|sso|auth|signin|account)(?:[/?#]|$)/i;
const CANVA_AUTH_HINT_RE = /(?:google|facebook|apple|microsoft|oauth|sso|signup|login|continue)/i;
const CANVA_OAUTH_AUTHORIZED_RE = /^\/oauth\/authorized(?:\/|$)/i;
const CANVA_OAUTH_RE = /^\/oauth(?:\/|$)/i;

const DEBUG_CATEGORY_ALIASES = {
  // Keep backward compatibility with older "drag" filter values.
  drag: 'dnd',
};

function normalizeDebugCategory(category = 'app') {
  const raw = String(category || 'app').trim().toLowerCase();
  return DEBUG_CATEGORY_ALIASES[raw] || raw || 'app';
}

const DEBUG_SPEC = String(process.env.CANVA_DEBUG || '').trim();
const DEBUG_TOKENS = new Set(
  DEBUG_SPEC
    .split(',')
    .map((item) => normalizeDebugCategory(item))
    .filter(Boolean)
);

function debugEnabled(category = 'app') {
  const normalizedSpec = DEBUG_SPEC.toLowerCase();
  if (!normalizedSpec || normalizedSpec === '0' || normalizedSpec === 'false') {
    return false;
  }
  const normalized = normalizeDebugCategory(category);
  if (['1', 'true', 'all', '*'].includes(normalizedSpec)) {
    return true;
  }
  return DEBUG_TOKENS.has('all') || DEBUG_TOKENS.has('*') || DEBUG_TOKENS.has(normalized);
}

function debugLog(category, ...args) {
  const normalized = normalizeDebugCategory(category);
  if (!debugEnabled(normalized)) return;
  console.log(`[canva:${normalized}]`, ...args);
}

const RELEASE_STATUS = {
  corrected: [
    'Global debug categories now use canonical names, including drag -> dnd compatibility.',
    'Window-open logging now distinguishes internal Canva tabs from real OAuth popup flows.',
    'Upload diagnostics now preserve ingress context from drop, paste, picker, and file-bearing network handoff.',
    'OAuth popup diagnostics no longer reference an undefined tab object during popup title or favicon updates.',
  ],
  validated: [
    'Application startup on Linux Wayland.',
    'Persistent session initialization and fixed Home tab shell behavior.',
    'Custom eyedropper behavior preserved after the global debug expansion.',
    'Host drag-and-drop into the Canva editor on Wayland with a real file drop.',
  ],
  underObservation: [
    'Host file picker continuation and clipboard-driven imports inside Canva.',
    'OAuth popup completion paths after the WebContentsView migration with a clean local session.',
    'Non-fatal DBus, VAAPI, and compositor warnings that do not block startup.',
  ],
};

let mainWindow = null;
let toolbarView = null;
let activeTabId = null;
let nextTabId = 1;
let nextPopupId = 1;
const tabs = new Map();
const authPopups = new Map();
let canvaSession = null;

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

function getCanvaSession() {
  if (!canvaSession) {
    canvaSession = session.fromPartition(PARTITION, { cache: true });
  }
  return canvaSession;
}

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

function extractHostname(urlish) {
  try {
    return new URL(urlish).hostname;
  } catch {
    return '';
  }
}

function isTrustedRemoteOrigin(urlish) {
  const hostname = extractHostname(urlish);
  if (!hostname) return false;
  return INTERNAL_HOST_RE.test(hostname) || OAUTH_PROVIDER_HOSTS.some((re) => re.test(hostname));
}

function shouldGrantRemotePermission(permission, origin, details = {}) {
  const trusted = isTrustedRemoteOrigin(origin) || isTrustedRemoteOrigin(details.requestingUrl || '');
  if (!trusted) return false;

  switch (permission) {
    case 'display-capture':
    case 'fullscreen':
    case 'media':
    case 'notifications':
    case 'pointerLock':
    case 'clipboard-sanitized-write':
    case 'clipboard-read':
      return true;
    case 'fileSystem':
      return isCanvaUrl(origin) || isCanvaUrl(details.requestingUrl || '');
    default:
      return false;
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

function detectCanvaOauthCallback(url) {
  if (!isCanvaUrl(url)) return null;
  try {
    const { pathname } = new URL(url);
    if (CANVA_OAUTH_AUTHORIZED_RE.test(pathname)) return 'authorized';
    if (CANVA_OAUTH_RE.test(pathname)) return 'oauth';
  } catch {
    return null;
  }
  return null;
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

function formatDebugList(items = []) {
  return items.map((item, index) => `${index + 1}.${item}`).join(' | ');
}

function logReleaseStatus() {
  debugLog('startup', 'release', `version=${APP_VERSION}`, `downloads=${app.getPath('downloads')}`);
  debugLog('startup', 'corrected', formatDebugList(RELEASE_STATUS.corrected));
  debugLog('startup', 'validated', formatDebugList(RELEASE_STATUS.validated));
  debugLog('startup', 'under-observation', formatDebugList(RELEASE_STATUS.underObservation));
}

function classifyWindowOpenRequest({ url, openerUrl, disposition, frameName }) {
  if (shouldTreatAsOauthPopup({ url, openerUrl, disposition, frameName })) {
    return { category: 'oauth', kind: 'oauth-popup' };
  }
  if (isCanvaUrl(url)) {
    return { category: 'tabs', kind: 'internal-tab' };
  }
  if (isBlankPopupUrl(url)) {
    return { category: 'tabs', kind: 'blank-window' };
  }
  return { category: 'tabs', kind: 'external-browser' };
}

function summarizeOauthEntry(entry) {
  if (!entry) return 'popup=unknown';
  return [
    `popup=${entry.id}`,
    `startedOnCanvaAuth=${entry.startedOnCanvaAuth ? 'true' : 'false'}`,
    `sawExternalProvider=${entry.sawExternalProvider ? 'true' : 'false'}`,
    `source=${entry.sourceWebContentsId || 'unknown'}`,
  ].join(' ');
}

function getAppIconPath() {
  return path.join(__dirname, 'assets', 'canva-icon.png');
}

function setAuthPopupTitle(window) {
  if (!window || window.isDestroyed()) return;
  window.setTitle(`${APP_NAME} — Login`);
}

// Flush cookies and storage so OAuth and Canva sessions survive restarts.
async function flushSession(ses) {
  await ses.cookies.flushStore();
  await ses.flushStorageData();
}

// Configure the shared session used by the main view and OAuth popups.
async function configureSession() {
  const ses = getCanvaSession();
  debugLog('session', 'configure', PARTITION);

  ses.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    const origin = details.requestingOrigin || details.requestingUrl || webContents?.getURL() || '';
    const granted = shouldGrantRemotePermission(permission, origin, details);

    debugLog('permissions', 'request', permission, granted ? 'allow' : 'deny', origin || 'unknown');
    if (permission === 'fileSystem') {
      debugLog('upload', 'permission-request', permission, granted ? 'allow' : 'deny', origin || 'unknown');
    }

    callback(granted);
  });

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details = {}) => {
    const origin = requestingOrigin || details.requestingUrl || webContents?.getURL() || '';
    const granted = shouldGrantRemotePermission(permission, origin, details);

    debugLog('permissions', 'check', permission, granted ? 'allow' : 'deny', origin || 'unknown');
    if (permission === 'fileSystem') {
      debugLog('upload', 'permission-check', permission, granted ? 'allow' : 'deny', origin || 'unknown');
    }

    return granted;
  });

  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders.DNT = '1';
    callback({ requestHeaders: details.requestHeaders });
  });

  ses.on('will-download', (_event, item) => {
    debugLog('upload', 'will-download', item.getFilename());
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

function windowLabel(window) {
  if (!window) return 'unknown-window';
  if (mainWindow && window === mainWindow) return 'main-window';
  for (const entry of authPopups.values()) {
    if (entry.window === window) return `oauth-popup-${entry.id}`;
  }
  return 'window';
}

function webContentsLabel(webContents) {
  if (!webContents) return 'unknown-webcontents';
  const tab = findTabByWebContents(webContents);
  if (tab) return `tab-${tab.id}`;
  for (const entry of authPopups.values()) {
    if (entry.window.webContents === webContents) return `oauth-popup-${entry.id}`;
  }
  return `wc-${webContents.id}`;
}

function shellBackgroundColor() {
  return nativeTheme.shouldUseDarkColors ? '#1f2329' : '#f6f7fb';
}

function sharedWebPreferences(extra = {}) {
  // All Canva surfaces (tabs + OAuth popups) must share the same session.
  return {
    session: getCanvaSession(),
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
    autoHideMenuBar: true,
    show: true,
    backgroundColor: shellBackgroundColor(),
    icon: getAppIconPath(),
    webPreferences: sharedWebPreferences(),
  };
}

function createShellWindow() {
  debugLog('app', 'create-shell-window');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: APP_NAME,
    autoHideMenuBar: true,
    backgroundColor: shellBackgroundColor(),
    show: false,
    icon: getAppIconPath(),
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
  debugLog('view', 'create-toolbar-view');
  // WebContentsView keeps toolbar chrome in-process with the tab shell layout.
  toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'toolbar-preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  ensureTopLevelView(toolbarView);
  toolbarView.webContents.on('did-finish-load', () => {
    debugLog('tabs', 'toolbar-loaded');
    broadcastTabsState();
  });
  toolbarView.webContents.loadURL(makeToolbarUrl());
  layoutViews();
}

function setTabVisibility(tab, visible) {
  if (!tab?.view) return;
  tab.view.setVisible(Boolean(visible));
}

function layoutViews() {
  debugLog('view', 'layout-views-start');
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
  debugLog('view', 'layout-views-done', `toolbar=${width}x${TOOLBAR_HEIGHT}`, `tabs=${tabs.size}`);
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
  debugLog('tabs', 'focus-home', `reset=${resetToHome}`);
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
  debugLog('app', 'theme-updated', currentTheme());
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
  debugLog('tabs', 'state-broadcast', `active=${activeTabId}`, `count=${tabs.size}`);
  if (toolbarView && !toolbarView.webContents.isDestroyed()) {
    toolbarView.webContents.send('tabs-state', toolbarState());
  }
  updateWindowTitle();
}

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
    const activeTab = tabs.get(activeTabId);
    debugLog('oauth', 'reload-active-tab-after-popup', popupId, activeTab ? `tab=${activeTab.id}` : 'tab=none');
    activeTab?.view.webContents.reload();
  }

  mainWindow?.focus();
}


function registerAuthPopupWindow(window, startUrl, { sourceWebContentsId = null, openerUrl = '' } = {}) {
  const popupId = nextPopupId++;
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
    sawExternalProvider: isOauthProviderUrl(startUrl),
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
  debugLog('oauth', 'popup-session-partition', `popup=${popupId}`, popupSessionPartition);

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
    mainWindow?.focus();
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
    debugLog('oauth', 'popup-title-updated', `popup=${popupId}`, title || APP_NAME);
    event.preventDefault();
    setAuthPopupTitle(window);
  });

  wc.setWindowOpenHandler(({ url, openerUrl: childOpenerUrl, disposition, frameName }) => {
    const request = classifyWindowOpenRequest({
      url,
      openerUrl: childOpenerUrl || wc.getURL(),
      disposition,
      frameName,
    });
    debugLog(request.category, 'popup-window-open', `popup=${popupId}`, `kind=${request.kind}`, url || 'about:blank', disposition || 'unknown', frameName || '');
    if (request.kind === 'oauth-popup' || isCanvaUrl(url)) {
      window.focus();
      if (!isBlankPopupUrl(url)) {
        window.loadURL(url);
      }
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  wc.on('will-navigate', (event, url) => {
    debugLog('oauth', 'popup-will-navigate', `popup=${popupId}`, url);
    if (shouldOpenInOauthPopup(url) || isCanvaUrl(url) || isBlankPopupUrl(url)) {
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
  });

  const syncPopupState = async (url) => {
    if (isOauthProviderUrl(url)) {
      entry.sawExternalProvider = true;
      debugLog('oauth', 'popup-provider-seen', `popup=${popupId}`, url);
      return;
    }

    const callbackType = detectCanvaOauthCallback(url);
    if (!callbackType) {
      return;
    }

    debugLog('oauth', 'popup-canva-callback-detected', `popup=${popupId}`, `type=${callbackType}`, url);
    if (callbackType === 'authorized') {
      entry.sawAuthorizedCallback = true;
      entry.pendingCallbackUrl = url;
      return;
    }

    // Keep tracking /oauth/* redirects and wait for /oauth/authorized/* before completion.
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
    debugLog(
      'oauth',
      'popup-did-fail-load',
      `popup=${popupId}`,
      `mainFrame=${isMainFrame ? 'true' : 'false'}`,
      `code=${code}`,
      description || 'no-description',
      validatedURL || 'unknown-url'
    );
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

// Attach navigation, popup, and keyboard handlers to a Canva WebContentsView.
function attachViewHandlers(tab) {
  debugLog('view', 'attach-handlers', `tab=${tab.id}`);
  const wc = tab.view.webContents;

  wc.setWindowOpenHandler(({ url, disposition, frameName }) => {
    const openerUrl = wc.getURL();
    const request = classifyWindowOpenRequest({ url, openerUrl, disposition, frameName });
    debugLog(request.category, 'tab-window-open', `tab=${tab.id}`, `kind=${request.kind}`, url || 'about:blank', disposition || 'unknown', frameName || '');

    if (request.kind === 'oauth-popup') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: popupWindowOptions(),
      };
    }

    if (request.kind === 'internal-tab') {
      createTab(url, { activate: disposition !== 'background-tab' });
      return { action: 'deny' };
    }

    if (!isBlankPopupUrl(url)) {
      debugLog('tabs', 'external-open', `tab=${tab.id}`, url);
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
    registerAuthPopupWindow(window, details.url || 'about:blank', {
      sourceWebContentsId: wc.id,
      openerUrl,
    });
  });

  wc.on('will-navigate', (event, url) => {
    if (shouldOpenInOauthPopup(url)) {
      debugLog('oauth', 'tab-nav-promoted-to-popup', `tab=${tab.id}`, url);
      if (isCanvaAuthUrl(wc.getURL())) {
        event.preventDefault();
        const popup = new BrowserWindow(popupWindowOptions());
        registerAuthPopupWindow(popup, url, { sourceWebContentsId: wc.id, openerUrl: wc.getURL() });
        popup.loadURL(url);
      }
      return;
    }

    if (!isCanvaUrl(url)) {
      debugLog('tabs', 'external-navigation-blocked', `tab=${tab.id}`, url);
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  const syncNavigation = () => {
    debugLog('view', 'tab-sync-navigation', `tab=${tab.id}`, wc.getURL() || tab.url);
    tab.url = wc.getURL() || tab.url;
    broadcastTabsState();
  };

  wc.on('did-navigate', syncNavigation);
  wc.on('did-navigate-in-page', syncNavigation);

  wc.on('page-title-updated', (event, title) => {
    debugLog('tabs', 'title-updated', `tab=${tab.id}`, title || APP_NAME);
    event.preventDefault();
    tab.title = title || APP_NAME;
    broadcastTabsState();
  });

  wc.on('page-favicon-updated', (_event, favicons) => {
    debugLog('tabs', 'favicon-updated', `tab=${tab.id}`, favicons?.[0] || 'none');
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
    if (debugEnabled('eyedropper')) {
      console.log('[canva-eyedropper]', 'frame-load', isMainFrame ? 'main' : 'sub', processId, routingId);
    }
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
  debugLog('tabs', 'create', url, `activate=${activate}`, `home=${isHome}`);
  const id = nextTabId++;
  // Each tab is a WebContentsView so the shell can control visibility/layout per tab.
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'canva-preload.js'),
      contextIsolation: false,
      sandbox: false,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: true,
      session: getCanvaSession(),
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
  debugLog('tabs', 'switch-request', id);
  if (!tabs.has(id) || !mainWindow) return;
  const tab = tabs.get(id);

  if (activeTabId === id) {
    tab.view.webContents.focus();
  debugLog('tabs', 'switch-active', id, tab.url);
    return;
  }

  detachActiveContentView();
  ensureTopLevelView(tab.view);
  setTabVisibility(tab, true);
  activeTabId = id;
  layoutViews();
  ensureTopLevelView(toolbarView);
  tab.view.webContents.focus();
  debugLog('tabs', 'switch-active', id, tab.url);
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
  debugLog('tabs', 'close-request', id);
  const ordered = getOrderedTabs();
  const index = ordered.findIndex((tab) => tab.id === id);
  const tab = tabs.get(id);
  // Home is fixed by design and must always remain available.
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
  debugLog('view', 'find-tab-by-webcontents', webContents ? webContents.id : 'none');
  if (!webContents) return null;
  for (const tab of tabs.values()) {
    if (tab.view.webContents.id === webContents.id) {
      return tab;
    }
  }
  return null;
}

ipcMain.handle('wrapper:eyedropper-snapshot', async (event) => {
  debugLog('eyedropper', 'snapshot-request', webContentsLabel(event.sender));
  const tab = findTabByWebContents(event.sender);
  if (!tab) {
    throw new Error('The active Canva tab was not found for the eyedropper snapshot.');
  }

  const bounds = tab.view.getBounds();
  const image = await tab.view.webContents.capturePage();
  const size = image.getSize();
  debugLog('eyedropper', 'snapshot', `${size.width}x${size.height}`, 'css', `${Math.max(1, bounds.width)}x${Math.max(1, bounds.height)}`);
  if (debugEnabled('eyedropper')) {
    console.log('[canva-eyedropper]', 'snapshot', `${size.width}x${size.height}`, 'css', `${Math.max(1, bounds.width)}x${Math.max(1, bounds.height)}`);
  }
  return {
    dataUrl: image.toDataURL(),
    width: size.width,
    height: size.height,
    cssWidth: Math.max(1, bounds.width),
    cssHeight: Math.max(1, bounds.height),
  };
});

ipcMain.on('wrapper:eyedropper-log', (_event, ...args) => {
  debugLog('eyedropper', ...args);
  if (debugEnabled('eyedropper')) {
    console.log('[canva-eyedropper]', ...args);
  }
});

ipcMain.on('wrapper:debug-log', (_event, payload = {}) => {
  const category = payload.category || 'app';
  const args = Array.isArray(payload.args) ? payload.args : [];
  debugLog(category, ...args);
});

ipcMain.on('toolbar-action', (_event, { action, payload = {} }) => {
  debugLog('tabs', 'toolbar-action', action, JSON.stringify(payload));
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
  debugLog('startup', 'when-ready', `platform=${process.platform}`, `wayland=${Boolean(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland')}`);
  debugLog('startup', 'debug-spec', DEBUG_SPEC || 'disabled');
  logReleaseStatus();
  await configureSession();
  debugLog('startup', 'session-configured');
  createShellWindow();
  createToolbarView();
  createHomeTab();

  nativeTheme.on('updated', () => {
    applyThemeToShell();
    broadcastTabsState();
  });

  app.on('activate', () => {
    debugLog('app', 'activate');
    if (BrowserWindow.getAllWindows().length === 0) {
      createShellWindow();
      createToolbarView();
      createHomeTab();
    }
  });
});

app.on('window-all-closed', async () => {
  debugLog('app', 'window-all-closed');
  debugLog('session', 'flush-before-quit', PARTITION);
  if (canvaSession) {
    await flushSession(canvaSession).catch(() => {});
  }
  if (process.platform !== 'darwin') app.quit();
});
