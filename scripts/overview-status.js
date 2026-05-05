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
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const bash = `source scripts/install-detection-common.sh; detect_installations; printf '{"nativeSystem":%s,"nativeUser":%s,"flatpakSystem":%s,"flatpakUser":%s,"appImageArtifacts":%s}' "$DETECTED_NATIVE_SYSTEM" "$DETECTED_NATIVE_USER" "$DETECTED_FLATPAK_SYSTEM" "$DETECTED_FLATPAK_USER" "$DETECTED_APPIMAGE_ARTIFACTS"`;
const out = spawnSync('bash', ['-lc', bash], { cwd: root, encoding: 'utf8' });
let installations = { nativeSystem: false, nativeUser: false, flatpakSystem: false, flatpakUser: false, appImageArtifacts: false };
if (out.status === 0) {
  try { installations = JSON.parse(out.stdout.trim()); } catch {}
}
console.log(JSON.stringify({ package: { version: pkg.version, phase: readPhase(), appId: 'io.github.coletivo420.canva-linux', executable: 'canva-linux', repository: 'https://github.com/coletivo420/canva-linux' }, installations }));
