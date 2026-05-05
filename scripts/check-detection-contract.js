#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const detection = fs.readFileSync(path.join(root, 'scripts/install-detection-common.sh'),'utf8');
const overview = fs.readFileSync(path.join(root, 'scripts/overview-status.js'),'utf8');
const required = [
  'DETECTED_NATIVE_SYSTEM','DETECTED_NATIVE_USER','DETECTED_FLATPAK_SYSTEM','DETECTED_FLATPAK_USER','DETECTED_APPIMAGE_ARTIFACTS',
  'DETECTED_NATIVE_SYSTEM_VERSION','DETECTED_NATIVE_USER_VERSION','DETECTED_FLATPAK_SYSTEM_VERSION','DETECTED_FLATPAK_USER_VERSION','DETECTED_APPIMAGE_VERSION'
];
for (const key of required) {
  if (!detection.includes(key)) { console.error(`[error] Missing in install-detection-common.sh: ${key}`); process.exit(1); }
  if (!overview.includes(key)) { console.error(`[error] Missing in overview-status.js: ${key}`); process.exit(1); }
}
console.log('[ok] Detection contract check passed');
