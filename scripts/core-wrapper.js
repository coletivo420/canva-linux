const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const autoBuildEnv = 'CANVA_SCRIPTS_CORE_AUTO_BUILD';
const disableAutoBuildEnv = 'CANVA_DISABLE_SCRIPTS_CORE_AUTO_BUILD';
const defaultBuildTimeoutMs = 120000;

function builtPath(entryName) {
  if (!/^[a-z0-9-]+$/.test(entryName)) {
    throw new Error(`Invalid scripts-core entry name: ${entryName}`);
  }
  return path.join(rootDir, '.build/scripts/core', `${entryName}.js`);
}

function buildTimeoutMs() {
  const raw = Number.parseInt(process.env.CANVA_SCRIPTS_CORE_BUILD_TIMEOUT_MS || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultBuildTimeoutMs;
}

function autoBuildSkipReason() {
  if (process.env[disableAutoBuildEnv] === '1') return 'disabled by CANVA_DISABLE_SCRIPTS_CORE_AUTO_BUILD=1';
  if (process.env[autoBuildEnv] === '1') return 'recursive scripts-core build guard';
  return '';
}

function buildScriptsCore() {
  const skipReason = autoBuildSkipReason();
  if (skipReason) {
    process.stderr.write(`[warn] scripts-core auto-build skipped: ${skipReason}. Run npm run build:scripts-core.\n`);
    return false;
  }

  const result = spawnSync('npm', ['run', 'build:scripts-core', '--silent'], {
    cwd: rootDir,
    stdio: ['ignore', 'ignore', 'pipe'],
    encoding: 'utf8',
    shell: false,
    timeout: buildTimeoutMs(),
    env: { ...process.env, [autoBuildEnv]: '1' },
  });

  if (result.error) {
    process.stderr.write(`[error] scripts-core build failed to start: ${result.error.message}\n`);
    return false;
  }
  if (result.signal) {
    process.stderr.write(`[error] scripts-core build was terminated by ${result.signal}. Run npm run build:scripts-core manually.\n`);
    if (result.stderr) process.stderr.write(result.stderr);
    return false;
  }
  if ((result.status ?? 1) !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    process.stderr.write('[error] scripts-core build is missing or failed. Run npm run build:scripts-core.\n');
    return false;
  }
  return true;
}

function loadCore(entryName) {
  const target = builtPath(entryName);
  if (!fs.existsSync(target) && !buildScriptsCore()) return null;
  return require(target);
}

function runCore(entryName, prefix) {
  const core = loadCore(entryName);
  if (!core) process.exit(1);

  if (typeof core.main !== 'function') {
    process.stderr.write(`[error] Core entry '${entryName}' does not export a main() function.\n`);
    process.exit(1);
  }

  try {
    process.exit(core.main());
  } catch (error) {
    process.stderr.write(`[${prefix}] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

module.exports = { loadCore, runCore };
