'use strict';

const fs = require('fs');
const path = require('path');

const LOG_COLORS = {
  ok: '\x1b[32m',
  warn: '\x1b[33m',
  critical: '\x1b[31m',
  reset: '\x1b[0m',
};

const RELEASE_STATUS = {
  corrected: [
    'Global debug categories now use canonical names, including drag -> dnd compatibility.',
    'Window-open logging now distinguishes internal Canva tabs from real OAuth popup flows.',
    'Upload diagnostics now preserve ingress context from drop, paste, picker, and file-bearing network handoff.',
    'OAuth popup diagnostics no longer reference an undefined tab object during popup title or favicon updates.',
    'Linux no longer disables Electron hardware acceleration by default.',
    'GPU diagnostics are centralized in current.log.',
  ],
  validated: [
    'Application startup on Linux Wayland.',
    'Persistent session initialization and fixed Home tab shell behavior.',
    'Custom eyedropper behavior preserved after the global debug expansion.',
    'Host drag-and-drop into the Canva editor on Wayland with a real file drop.',
    'GPU backend selection with CANVA_GPU_BACKEND=auto,opengl,vulkan,software,force.',
    'Flatpak DRI access and Chromium GPU feature status logging.',
  ],
  underObservation: [
    'Host file picker continuation and clipboard-driven imports inside Canva.',
    'OAuth popup completion paths after the WebContentsView migration with a clean local session.',
    'Non-fatal DBus, VAAPI, and compositor warnings that do not block startup.',
    'Vulkan/ANGLE behavior across Intel, AMD, NVIDIA, Wayland, and X11.',
  ],
};

function formatTerminalPrefix({ category, source = 'main', level = 'ok' }) {
  const prefix = `[canva:${source}:${category}]`;
  const color = LOG_COLORS[level];
  if (!color) return prefix;
  return `${color}${prefix}${LOG_COLORS.reset}`;
}

function formatFilePrefix({ category, source = 'main', level = 'ok' }) {
  return `[canva:${source}:${category}:${level}]`;
}

function formatDebugList(items = []) {
  return items.map((item, index) => `${index + 1}.${item}`).join(' | ');
}

function createCentralLogger({ app }) {
  let logFilePath = null;

  function normalizeArgs(args = []) {
    return args.map((value) => {
      if (typeof value === 'string') return value;
      if (value instanceof Error) return value.stack || value.message || String(value);
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
  }

  function appendFileLine(prefix, args) {
    if (!logFilePath) return;
    const line = `${new Date().toISOString()} ${prefix} ${normalizeArgs(args).join(' ')}\n`;
    try {
      fs.appendFileSync(logFilePath, line, 'utf8');
    } catch {}
  }

  function write(level, prefix, args) {
    if (level === 'critical') {
      console.error(prefix, ...args);
      return;
    }
    if (level === 'warn') {
      console.warn(prefix, ...args);
      return;
    }
    console.log(prefix, ...args);
  }

  function initLogFile() {
    const logsDirPath = path.join(app.getPath('userData'), 'logs');
    const currentLogPath = path.join(logsDirPath, 'current.log');
    fs.mkdirSync(logsDirPath, { recursive: true });
    if (fs.existsSync(currentLogPath)) {
      fs.unlinkSync(currentLogPath);
    }
    fs.writeFileSync(currentLogPath, '', 'utf8');
    logFilePath = currentLogPath;
    return currentLogPath;
  }

  function logDebug(category, args = [], { source = 'main', level = 'ok' } = {}) {
    const terminalPrefix = formatTerminalPrefix({ category, source, level });
    const filePrefix = formatFilePrefix({ category, source, level });
    write(level, terminalPrefix, args);
    appendFileLine(filePrefix, args);
  }

  function logStatus(category, level, message, { source = 'main' } = {}) {
    const terminalPrefix = formatTerminalPrefix({ category, source, level });
    const filePrefix = formatFilePrefix({ category, source, level });
    write(level, terminalPrefix, [message]);
    appendFileLine(filePrefix, [message]);
  }

  return {
    initLogFile,
    logDebug,
    logStatus,
    getLogFilePath() {
      return logFilePath;
    },
  };
}

function createStatusLogger({ app, safeStorage, debugLog, logStatus, appVersion }) {
  function logReleaseStatus() {
    debugLog('startup', 'release', `version=${appVersion}`, `downloads=${app.getPath('downloads')}`);
    debugLog('startup', 'corrected', formatDebugList(RELEASE_STATUS.corrected));
    debugLog('startup', 'validated', formatDebugList(RELEASE_STATUS.validated));
    debugLog('startup', 'under-observation', formatDebugList(RELEASE_STATUS.underObservation));
  }

  function logCredentialStorageBackend() {
    if (process.platform !== 'linux') return;

    let backend = 'unknown';
    try {
      backend = safeStorage.getSelectedStorageBackend();
    } catch (error) {
      logStatus('session', 'warn', `credential-storage-backend-error WARNING: ${error.message}`);
      return;
    }

    if (backend === 'basic_text') {
      logStatus(
        'session',
        'critical',
        'credential-storage-backend basic_text CRITICAL: Electron/Chromium is using the basic plaintext fallback because no supported Linux secret service/keyring was selected. Install or enable KWallet/GNOME Keyring/Secret Service integration for better credential protection.'
      );
      return;
    }

    if (backend === 'unknown') {
      logStatus(
        'session',
        'warn',
        'credential-storage-backend unknown WARNING: Electron could not verify the selected credential storage backend. This does not prove plaintext storage, but credential protection could not be verified. Check KWallet/GNOME Keyring/Secret Service integration.'
      );
      return;
    }

    logStatus('session', 'ok', `credential-storage-backend ${backend} OK: secure Linux secret storage backend detected.`);
  }

  return {
    logCredentialStorageBackend,
    logReleaseStatus,
    logStatus,
  };
}

module.exports = {
  createCentralLogger,
  createStatusLogger,
};
