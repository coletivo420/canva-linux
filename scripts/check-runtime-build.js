#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pkg = require(path.join(repoRoot, 'package.json'));

const expectedMain = '.build/electron/main/index.js';

let failed = false;

function requireFile(file) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    console.error(`[runtime-build-check] missing file: ${file}`);
    failed = true;
  }
}

function requireDir(dir) {
  if (!fs.existsSync(path.join(repoRoot, dir))) {
    console.error(`[runtime-build-check] missing directory: ${dir}`);
    failed = true;
  }
}

if (pkg.main !== expectedMain) {
  console.error(`[runtime-build-check] package.json main must be ${expectedMain}, got: ${pkg.main}`);
  failed = true;
}

if (pkg.build?.extraMetadata?.main !== expectedMain) {
  console.error('[runtime-build-check] build.extraMetadata.main must match compiled runtime entrypoint');
  failed = true;
}

requireFile('.build/electron/main/index.js');
requireFile('.build/electron/main/logging-normalize.js');
requireFile('.build/electron/shared/debug.js');
requireFile('.build/electron/shared/navigation.js');
requireFile('.build/electron/preload/canva.bundle.js');
requireFile('.build/electron/ui/toolbar.html');
requireDir('.build/electron/assets');

if (failed) {
  process.exit(1);
}

console.log('[runtime-build-check] OK');
