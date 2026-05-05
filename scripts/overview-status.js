#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');

function readPhase() {
  const content = fs.readFileSync(path.join(root, 'scripts/app-identity-common.sh'), 'utf8');
  const m = content.match(/^PROJECT_PHASE="([^"]+)"/m);
  return m ? m[1] : 'unknown';
}

function parseKeyValueLines(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      result[key] = parts.slice(1).join('=');
    }

const bash = `source scripts/install-detection-common.sh; detect_installations;
echo DETECTED_NATIVE_SYSTEM=$DETECTED_NATIVE_SYSTEM
echo DETECTED_NATIVE_USER=$DETECTED_NATIVE_USER
echo DETECTED_FLATPAK_SYSTEM=$DETECTED_FLATPAK_SYSTEM
echo DETECTED_FLATPAK_USER=$DETECTED_FLATPAK_USER
echo DETECTED_APPIMAGE_ARTIFACTS=$DETECTED_APPIMAGE_ARTIFACTS
echo DETECTED_NATIVE_SYSTEM_VERSION=$DETECTED_NATIVE_SYSTEM_VERSION
echo DETECTED_NATIVE_USER_VERSION=$DETECTED_NATIVE_USER_VERSION
echo DETECTED_FLATPAK_SYSTEM_VERSION=$DETECTED_FLATPAK_SYSTEM_VERSION
echo DETECTED_FLATPAK_USER_VERSION=$DETECTED_FLATPAK_USER_VERSION
echo DETECTED_APPIMAGE_VERSION=$DETECTED_APPIMAGE_VERSION
`;

  process.exit(out.status || 1);
}

const lines = parseKeyValueLines(out.stdout);

  `echo DETECTED_NATIVE_SYSTEM_VERSION=$DETECTED_NATIVE_SYSTEM_VERSION;
` +
  `echo DETECTED_NATIVE_USER_VERSION=$DETECTED_NATIVE_USER_VERSION;
` +
  `echo DETECTED_FLATPAK_SYSTEM_VERSION=$DETECTED_FLATPAK_SYSTEM_VERSION;
` +
  `echo DETECTED_FLATPAK_USER_VERSION=$DETECTED_FLATPAK_USER_VERSION;
` +
  `echo DETECTED_APPIMAGE_VERSION=$DETECTED_APPIMAGE_VERSION;
`;

const out = spawnSync('bash', ['-c', bash], { cwd: root, encoding: 'utf8' });
const lines = out.status === 0 ? parseKeyValueLines(out.stdout) : {};
const bool = (v) => v === 'true';
const installations = {
  nativeSystem: bool(lines.DETECTED_NATIVE_SYSTEM),
  nativeUser: bool(lines.DETECTED_NATIVE_USER),
  flatpakSystem: bool(lines.DETECTED_FLATPAK_SYSTEM),
  flatpakUser: bool(lines.DETECTED_FLATPAK_USER),
  appImageArtifacts: bool(lines.DETECTED_APPIMAGE_ARTIFACTS),
  nativeSystemVersion: lines.DETECTED_NATIVE_SYSTEM_VERSION || '',
  nativeUserVersion: lines.DETECTED_NATIVE_USER_VERSION || '',
  flatpakSystemVersion: lines.DETECTED_FLATPAK_SYSTEM_VERSION || '',
  flatpakUserVersion: lines.DETECTED_FLATPAK_USER_VERSION || '',
  appImageVersion: lines.DETECTED_APPIMAGE_VERSION || ''
};

console.log(JSON.stringify({
  package: {
    version: pkg.version,
    phase: readPhase(),
    appId: 'io.github.coletivo420.canva-linux',
    executable: 'canva-linux',
    repository: 'https://github.com/coletivo420/canva-linux'
  },
  installations
}));
