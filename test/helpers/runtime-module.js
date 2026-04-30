'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
let runtimeBuildChecked = false;

/**
 * @param {string} modulePath
 * @returns {void}
 */
function ensureRuntimeBuild(modulePath) {
  const sourceTs = path.join(repoRoot, 'electron', `${modulePath}.ts`);
  const sourceJs = path.join(repoRoot, 'electron', `${modulePath}.js`);
  const sourcePath = fs.existsSync(sourceTs) ? sourceTs : sourceJs;
  const builtJs = path.join(repoRoot, '.build', 'electron', `${modulePath}.js`);

  if (!fs.existsSync(sourcePath)) {
    return;
  }

  const buildMissing = !fs.existsSync(builtJs);
  const buildStale = !buildMissing && fs.statSync(builtJs).mtimeMs < fs.statSync(sourcePath).mtimeMs;

  if (!buildMissing && !buildStale) {
    return;
  }

  if (runtimeBuildChecked) {
    throw new Error(`Runtime build did not produce ${path.relative(repoRoot, builtJs)}`);
  }

  runtimeBuildChecked = true;
  const result = spawnSync(process.execPath, ['scripts/build-runtime.js'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Runtime build failed while preparing ${modulePath}`);
  }
}

/**
 * @param {string} modulePath
 * @param {{ preferBuild?: boolean }} [options]
 * @returns {any}
 */
function loadRuntimeModule(modulePath, options = {}) {
  const sourceJs = path.join(repoRoot, 'electron', `${modulePath}.js`);

  if (!options.preferBuild && fs.existsSync(sourceJs)) {
    return require(sourceJs);
  }

  ensureRuntimeBuild(modulePath);
  return require(path.join(repoRoot, '.build', 'electron', `${modulePath}.js`));
}

module.exports = {
  loadRuntimeModule,
};
