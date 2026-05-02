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
requireFile('.build/electron/main/logging.js');
requireFile('.build/electron/main/logging-helpers.js');
requireFile('.build/electron/main/gpu-diagnostics.js');
requireFile('.build/electron/main/runtime.js');
requireFile('.build/electron/main/ipc.js');
requireFile('.build/electron/main/lifecycle.js');
requireFile('.build/electron/main/eyedropper-bridge.js');
requireFile('.build/electron/main/shell.js');
requireFile('.build/electron/main/oauth.js');
requireFile('.build/electron/main/tabs.js');
requireFile('.build/electron/main/tab-controller.js');
requireFile('.build/electron/main/tab-events.js');
requireFile('.build/electron/main/window-open-policy.js');
requireFile('.build/electron/shared/debug.js');
requireFile('.build/electron/shared/navigation.js');
requireFile('.build/electron/preload/debug.js');
requireFile('.build/electron/preload/upload-diagnostics.js');
requireFile('.build/electron/preload/browser-capture-diagnostics.js');
requireFile('.build/electron/preload/eyedropper-routing-diagnostics.js');
requireFile('.build/electron/preload/custom-eyedropper-flow.js');
requireFile('.build/electron/preload/native-eyedropper-wrapper.js');
requireFile('.build/electron/preload/canva.js');
requireFile('.build/electron/preload/cl-eyedropper/index.js');
requireFile('.build/electron/preload/cl-eyedropper/cl-eyedropper.js');
requireFile('.build/electron/preload/canva.bundle.js');
requireFile('.build/electron/ui/toolbar.html');
requireDir('.build/electron/assets');

const compiledMainPath = path.join(repoRoot, '.build/electron/main/index.js');
if (fs.existsSync(compiledMainPath)) {
  const compiledMain = fs.readFileSync(compiledMainPath, 'utf8');
  if (compiledMain.includes("require('../../package.json')")) {
    console.error('[runtime-build-check] compiled main must not require ../../package.json from .build/');
    failed = true;
  }
}

const bundlePath = path.join(repoRoot, '.build/electron/preload/canva.bundle.js');
if (fs.existsSync(bundlePath)) {
  const bundle = fs.readFileSync(bundlePath, 'utf8');
  const forbidden = [
    ['ltcode', 'eyedropper'].join('-'),
    ['LTCode', 'EyeDropper'].join(''),
    ['install', 'Ltcode', 'ScalingPatch'].join(''),
    ['remove', 'Ltcode', 'Ui'].join(''),
    ['CANVA', 'EYEDROPPER', 'IMPL'].join('_'),
    ['--canva', 'eyedropper', 'impl'].join('-'),
  ];

  for (const token of forbidden) {
    if (bundle.includes(token)) {
      console.error(`[runtime-build-check] legacy EyeDropper token present in preload bundle: ${token}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('[runtime-build-check] OK');
