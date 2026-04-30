'use strict';

// @ts-check

/**
 * @typedef {(category: string, ...args: unknown[]) => boolean} DebugLog
 */

/**
 * @typedef {{
 *   appendSwitch(name: string, value?: string): void;
 *   getSwitchValue(name: string): string;
 * }} CommandLineLike
 */

/**
 * @typedef {{
 *   commandLine: CommandLineLike;
 *   disableHardwareAcceleration?: () => void;
 *   getPath(name: string): string;
 *   setDesktopName?: (name: string) => void;
 *   setName?: (name: string) => void;
 *   setPath(name: string, path: string): void;
 *   setAppUserModelId?: (id: string) => void;
 * }} ElectronAppLike
 */

/**
 * @typedef {{
 *   cookies: { flushStore(): Promise<void> };
 *   flushStorageData(): Promise<void>;
 *   setPermissionRequestHandler(handler: (webContents: WebContentsLike | null | undefined, permission: string, callback: (granted: boolean) => void, details?: PermissionDetailsLike) => void): void;
 *   setPermissionCheckHandler(handler: (webContents: WebContentsLike | null | undefined, permission: string, requestingOrigin?: string, details?: PermissionDetailsLike) => boolean): void;
 *   webRequest: { onBeforeSendHeaders(handler: (details: BeforeSendHeadersDetailsLike, callback: (response: { requestHeaders: Record<string, string> }) => void) => void): void };
 *   on(event: 'will-download', listener: (event: unknown, item: DownloadItemLike) => void): void;
 * }} SessionLike
 */

/**
 * @typedef {{ getURL(): string }} WebContentsLike
 * @typedef {{ requestingOrigin?: string, requestingUrl?: string }} PermissionDetailsLike
 * @typedef {{ requestHeaders: Record<string, string> }} BeforeSendHeadersDetailsLike
 * @typedef {{ getFilename(): string, setSavePath(path: string): void }} DownloadItemLike
 */

/**
 * @param {ElectronAppLike} app
 * @param {string} featureName
 * @returns {void}
 */
function appendDisableFeature(app, featureName) {
  const switchName = 'disable-features';
  const currentValue = app.commandLine.getSwitchValue(switchName);
  const features = new Set(
    String(currentValue || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

  features.add(featureName);
  app.commandLine.appendSwitch(switchName, Array.from(features).join(','));
}

/**
 * @param {{ app: ElectronAppLike, appId: string, wmClass: string, path: Pick<typeof import('node:path'), 'join'> }} options
 * @returns {void}
 */
function configureLinuxRuntime({ app, appId, wmClass, path }) {
  app.setName?.('Canva Linux');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('metrics-recording-only');
  app.commandLine.appendSwitch('no-first-run');
  app.commandLine.appendSwitch('no-default-browser-check');
  // Reduces non-fatal Bluetooth/Floss log noise in Flatpak; does not disable system Bluetooth.
  appendDisableFeature(app, 'Floss');

  if (process.platform === 'linux') {
    app.setDesktopName?.(`${appId}.desktop`);
    app.commandLine.appendSwitch('class', wmClass);
    app.commandLine.appendSwitch('font-render-hinting', 'medium');
    app.commandLine.appendSwitch('enable-font-antialiasing');

    if (process.env.CANVA_DISABLE_GPU === '1') {
      app.disableHardwareAcceleration?.();
      app.commandLine.appendSwitch('disable-gpu');
      app.commandLine.appendSwitch('disable-gpu-compositing');
    }
  }

  if (shouldEnableCaptureVerboseLogging()) {
    app.commandLine.appendSwitch('enable-logging');
    app.commandLine.appendSwitch('v', '1');
    app.commandLine.appendSwitch(
      'vmodule',
      [
        '*desktop_capture*=3',
        '*screen_capture*=3',
        '*webrtc*=2',
        '*pipewire*=2',
      ].join(',')
    );
  }

  app.setPath('sessionData', path.join(app.getPath('userData'), 'session'));
}

/**
 * @returns {boolean}
 */
function shouldEnableCaptureVerboseLogging() {
  const level = String(process.env.CANVA_DEBUG_LEVEL || '').trim();

  if (level === '2') return true;

  return String(process.env.CANVA_DEBUG || '').trim() === '2';
}

/**
 * @param {SessionLike} ses
 * @returns {Promise<void>}
 */
async function flushSession(ses) {
  await ses.cookies.flushStore();
  await ses.flushStorageData();
}

/**
 * @param {() => SessionLike} getCanvaSession
 * @param {Record<string, unknown>} [extra]
 * @returns {Record<string, unknown> & { session: SessionLike, contextIsolation: boolean, sandbox: boolean, nodeIntegration: boolean, spellcheck: boolean }}
 */
function sharedWebPreferences(getCanvaSession, extra = {}) {
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

/**
 * @param {{
 *   app: Pick<ElectronAppLike, 'getPath'>;
 *   debugLog: DebugLog;
 *   flushSessionFn?: (session: SessionLike) => Promise<void>;
 *   getCanvaSession: () => SessionLike;
 *   path: Pick<typeof import('node:path'), 'join'>;
 *   partition: string;
 *   shouldGrantRemotePermission: (permission: string, origin: string, details: PermissionDetailsLike) => boolean;
 * }} options
 * @returns {Promise<SessionLike>}
 */
async function configureSession({
  app,
  debugLog,
  flushSessionFn = flushSession,
  getCanvaSession,
  path,
  partition,
  shouldGrantRemotePermission,
}) {
  const ses = getCanvaSession();
  debugLog('session', 'configure', partition);

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

  await flushSessionFn(ses).catch(() => {});
  return ses;
}

module.exports = {
  configureLinuxRuntime,
  configureSession,
  flushSession,
  sharedWebPreferences,
  shouldEnableCaptureVerboseLogging,
};
