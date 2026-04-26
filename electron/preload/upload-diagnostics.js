'use strict';

function describeDragTarget(target) {
  if (!target || typeof target !== 'object') return 'unknown';
  const tagName = target.tagName ? String(target.tagName).toLowerCase() : 'node';
  const id = target.id ? `#${target.id}` : '';
  const className = typeof target.className === 'string' && target.className.trim()
    ? `.${target.className.trim().split(/\s+/).slice(0, 3).join('.')}`
    : '';
  return `${tagName}${id}${className}`;
}

function describeFileInput(target) {
  if (!(target instanceof HTMLInputElement) || target.type !== 'file') {
    return null;
  }
  return {
    accept: target.accept || 'any',
    multiple: target.multiple ? 'true' : 'false',
    webkitdirectory: target.webkitdirectory ? 'true' : 'false',
    target: describeDragTarget(target),
  };
}

function nextUploadIngressId() {
  const scope = globalThis || window;
  scope.__canvaUploadIngressCounter = (scope.__canvaUploadIngressCounter || 0) + 1;
  return scope.__canvaUploadIngressCounter;
}

function formatFileDescriptor(file) {
  if (!file) return 'unknown';
  const name = typeof file.name === 'string' && file.name ? file.name : 'blob';
  const type = typeof file.type === 'string' && file.type ? file.type : 'unknown';
  const size = Number.isFinite(file.size) ? file.size : 0;
  return `${name}:${type}:${size}`;
}

function summarizeFiles(files, limit = 3) {
  if (!files || typeof files.length !== 'number' || files.length < 1) return 'none';
  return Array.from(files)
    .slice(0, limit)
    .map((file) => formatFileDescriptor(file))
    .join(',');
}

function summarizeClipboardKinds(dataTransfer) {
  const kinds = new Set();
  const types = dataTransfer?.types ? Array.from(dataTransfer.types) : [];
  const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
  if (dataTransfer?.files?.length) kinds.add('files');
  for (const item of items) {
    if (item.kind === 'file') {
      kinds.add('files');
      if ((item.type || '').startsWith('image/')) {
        kinds.add('image');
      }
    }
    if (item.kind === 'string') {
      if (item.type === 'text/html') kinds.add('html');
      if (item.type === 'text/plain') kinds.add('text');
      if (item.type === 'text/uri-list') kinds.add('url');
    }
  }
  for (const type of types) {
    if (type === 'text/html') kinds.add('html');
    if (type === 'text/plain') kinds.add('text');
    if (type === 'text/uri-list') kinds.add('url');
    if (type.startsWith('image/')) kinds.add('image');
  }
  return kinds.size ? Array.from(kinds).join(',') : 'none';
}

function rememberUploadIngress(source, info = {}) {
  const scope = globalThis || window;
  // Persist the last ingress source so network logs can be correlated later.
  const ingress = {
    id: nextUploadIngressId(),
    source,
    timestamp: Date.now(),
    ...info,
  };
  scope.__canvaLastUploadIngress = ingress;
  return ingress;
}

function recentUploadIngressSummary() {
  const scope = globalThis || window;
  const ingress = scope.__canvaLastUploadIngress;
  if (!ingress || !ingress.timestamp) return 'id=none source=none';
  const ageMs = Math.max(0, Date.now() - ingress.timestamp);
  return [
    `id=${ingress.id || 'none'}`,
    `source=${ingress.source || 'unknown'}`,
    `ageMs=${ageMs}`,
    `files=${ingress.files ?? 0}`,
    `types=${ingress.types || 'none'}`,
    ingress.target || 'unknown',
  ].join(' ');
}

// Keep upload diagnostics in a dedicated module so Canva preload logic can stay
// focused on product behavior while this observability layer evolves separately.
function installUploadDiagnostics({ debugEnabled, debugLog }) {
  const scope = globalThis || window;
  if (scope.__canvaDragDiagnosticsInstalled) return;
  scope.__canvaDragDiagnosticsInstalled = true;

  const summarizeDataTransfer = (dataTransfer, target) => {
    const files = dataTransfer?.files ? Array.from(dataTransfer.files) : [];
    const items = dataTransfer?.items ? Array.from(dataTransfer.items) : [];
    const types = dataTransfer?.types ? Array.from(dataTransfer.types) : [];
    return {
      files: files.length,
      fileSummary: summarizeFiles(files),
      items: items.map((item) => `${item.kind}:${item.type || 'unknown'}`).join(','),
      kinds: summarizeClipboardKinds(dataTransfer),
      types: types.join(','),
      dropEffect: dataTransfer?.dropEffect || 'none',
      effectAllowed: dataTransfer?.effectAllowed || 'none',
      target: describeDragTarget(target),
    };
  };

  const recordIngressFromDataTransfer = (source, info) => {
    if (!info || (info.files < 1 && (!info.items || info.items === 'none') && (!info.types || info.types === 'none'))) return null;
    return rememberUploadIngress(source, {
      files: info.files,
      types: info.types,
      target: info.target,
      fileSummary: info.fileSummary,
      kinds: info.kinds,
    });
  };

  const logDrag = (label, event) => {
    if (!debugEnabled('dnd')) return;
    const info = summarizeDataTransfer(event.dataTransfer, event.target);
    let ingress = null;
    if (label === 'drop') {
      ingress = recordIngressFromDataTransfer('drop', info);
    }
    debugLog(
      'dnd',
      label,
      ingress ? `id=${ingress.id}` : 'id=none',
      `files=${info.files}`,
      `fileSummary=${info.fileSummary || 'none'}`,
      `items=${info.items || 'none'}`,
      `kinds=${info.kinds || 'none'}`,
      `types=${info.types || 'none'}`,
      `dropEffect=${info.dropEffect}`,
      `effectAllowed=${info.effectAllowed}`,
      info.target
    );
  };

  const logUploadInput = (label, target, { remember = true } = {}) => {
    const info = describeFileInput(target);
    if (!info) return;
    let ingress = null;
    if (remember) {
      ingress = rememberUploadIngress(label, {
        files: 0,
        types: 'file-input',
        target: info.target,
      });
    }
    debugLog(
      'upload',
      label,
      ingress ? `id=${ingress.id}` : 'id=none',
      `accept=${info.accept}`,
      `multiple=${info.multiple}`,
      `webkitdirectory=${info.webkitdirectory}`,
      info.target
    );
  };

  window.addEventListener('dragenter', (event) => logDrag('enter', event), true);
  window.addEventListener('dragover', (event) => logDrag('over', event), true);
  window.addEventListener('dragleave', (event) => logDrag('leave', event), true);
  window.addEventListener('dragstart', (event) => logDrag('start', event), true);
  window.addEventListener('dragend', (event) => {
    logDrag('end', event);
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
      } catch {}
    });
  }, true);
  window.addEventListener('drop', (event) => {
    logDrag('drop', event);
    debugLog('upload', 'drop-ingress', recentUploadIngressSummary());
    queueMicrotask(() => {
      try {
        window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, buttons: 0 }));
      } catch {}
    });
  }, true);
  window.addEventListener('paste', (event) => {
    const info = summarizeDataTransfer(event.clipboardData, event.target);
    if (info.files < 1 && !info.items) return;
    recordIngressFromDataTransfer('paste', info);
    debugLog('upload', 'paste', `files=${info.files}`, `items=${info.items || 'none'}`, `types=${info.types || 'none'}`, info.target);
  }, true);

  document.addEventListener('click', (event) => {
    logUploadInput('input-click', event.target);
  }, true);

  document.addEventListener('change', (event) => {
    debugLog('upload', 'document-change', describeDragTarget(event.target));
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'file') return;
    logUploadInput('input-change-meta', target);
    debugLog('upload', 'input-change', `files=${target.files ? target.files.length : 0}`, describeDragTarget(target));
  }, true);

  if (typeof scope.showOpenFilePicker === 'function' && !scope.showOpenFilePicker.__canvaDebugWrapped) {
    const original = scope.showOpenFilePicker.bind(scope);
    const wrapped = async (...args) => {
      debugLog('upload', 'show-open-file-picker', `args=${args.length}`);
      try {
        const handles = await original(...args);
        debugLog('upload', 'show-open-file-picker-result', `handles=${Array.isArray(handles) ? handles.length : 0}`);
        return handles;
      } catch (error) {
        debugLog('upload', 'show-open-file-picker-error', error?.name || 'Error', error?.message || '');
        throw error;
      }
    };

    wrapped.__canvaDebugWrapped = true;
    scope.showOpenFilePicker = wrapped;
  }
}

module.exports = {
  installUploadDiagnostics,
};
