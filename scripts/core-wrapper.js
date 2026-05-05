const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');

function builtPath(entryName) {
  return path.join(rootDir, '.build/scripts/core', `${entryName}.js`);
}

function buildScriptsCore() {
  console.log('[info] Building scripts-core...');
  const result = spawnSync('npm', ['run', 'build:scripts-core', '--silent'], {
    cwd: rootDir,
    stdio: ['ignore', 'ignore', 'inherit'],
    encoding: 'utf8',
    shell: false,
  });
  if ((result.status ?? 1) !== 0) {
    process.stderr.write('[error] scripts-core build failed.\n');
    process.exit(1);
  }
  return true;
}

function loadCore(entryName) {
  const target = builtPath(entryName);
  if (!fs.existsSync(target)) {
    buildScriptsCore();
  }
  if (!fs.existsSync(target)) {
    process.stderr.write(`[error] core module not found after build: ${entryName}\n`);
    process.exit(1);
  }
  return require(target);
}

module.exports = { loadCore };
