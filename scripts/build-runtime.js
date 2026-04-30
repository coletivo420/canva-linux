#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function run(label, command, args) {
  console.log(`[runtime-build] ${label}`);

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run('clean .build', process.execPath, ['scripts/clean-runtime-build.js']);
run('compile electron runtime', 'npx', ['tsc', '-p', 'tsconfig.build.json']);
run('copy runtime assets', process.execPath, ['scripts/copy-runtime-assets.js']);
run('build preload bundle in .build', process.execPath, [
  'scripts/build-preload-bundle.js',
  '--build-output',
]);

const requiredFiles = [
  '.build/electron/main/index.js',
  '.build/electron/preload/canva.bundle.js',
  '.build/electron/ui/toolbar.html',
  '.build/electron/assets',
];

for (const file of requiredFiles) {
  const absolute = path.join(repoRoot, file);
  if (!fs.existsSync(absolute)) {
    console.error(`[runtime-build] missing required build artifact: ${file}`);
    process.exit(1);
  }
}

console.log('[runtime-build] OK');
