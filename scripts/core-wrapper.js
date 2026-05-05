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

function readProjectField(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function fallbackOverviewStatus() {
  const pkg = readProjectField('package.json', {});
  let phase = 'unknown';
  try {
    const identity = fs.readFileSync(path.join(rootDir, 'scripts/app-identity-common.sh'), 'utf8');
    const match = identity.match(/^PROJECT_PHASE="([^"]+)"/m);
    if (match) phase = match[1];
  } catch {
    phase = 'unknown';
  }
  return {
    package: {
      version: typeof pkg.version === 'string' ? pkg.version : 'unknown',
      phase,
      appId: 'io.github.coletivo420.canva-linux',
      executable: 'canva-linux',
      repository: 'https://github.com/coletivo420/canva-linux',
    },
    installations: {
      nativeSystem: false,
      nativeUser: false,
      flatpakSystem: false,
      flatpakUser: false,
      appImageArtifacts: false,
      nativeSystemVersion: '',
      nativeUserVersion: '',
      flatpakSystemVersion: '',
      flatpakUserVersion: '',
      appImageVersion: '',
    },
  };
}

module.exports = { loadCore, fallbackOverviewStatus };
