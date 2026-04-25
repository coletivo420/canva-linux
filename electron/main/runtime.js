'use strict';

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

function configureLinuxRuntime({ app, appId, debugSpec, wmClass, path }) {
  app.setName('Canva');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('disable-sync');
  app.commandLine.appendSwitch('metrics-recording-only');
  app.commandLine.appendSwitch('no-first-run');
  app.commandLine.appendSwitch('no-default-browser-check');
  // Reduces non-fatal Bluetooth/Floss log noise in Flatpak; does not disable system Bluetooth.
  appendDisableFeature(app, 'Floss');

  if (process.platform === 'linux') {
    app.setDesktopName(`${appId}.desktop`);
    app.commandLine.appendSwitch('class', wmClass);
    app.commandLine.appendSwitch('font-render-hinting', 'medium');
    app.commandLine.appendSwitch('enable-font-antialiasing');
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu-compositing');
  }

  if (shouldEnableCaptureVerboseLogging(debugSpec)) {
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

function shouldEnableCaptureVerboseLogging(debugSpec) {
  const raw = String(debugSpec || '').trim().toLowerCase();
  if (!raw) return false;
  return raw.split(',').some((token) => {
    const value = token.trim();
    return value === '1'
      || value === 'all'
      || value === '*'
      || value === 'eyedropper'
      || value === 'routing'
      || value.startsWith('routing:')
      || value === 'eyedropper-routing'
      || value.startsWith('eyedropper:')
      || value === 'capture'
      || value.startsWith('capture:')
      || value === 'debug';
  });
}

async function flushSession(ses) {
  await ses.cookies.flushStore();
  await ses.flushStorageData();
}

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
};
