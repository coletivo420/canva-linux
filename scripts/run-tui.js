#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);
const outFile = path.join(rootDir, '.build/scripts/tui/index.js');
const tuiDir = path.join(rootDir, 'scripts/tui');
const identityFile = path.join(rootDir, 'scripts/app-identity-common.sh');

function listTsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    return entry.isFile() && full.endsWith('.ts') ? [full] : [];
  });
}

function needsBuild() {
  if (!fs.existsSync(outFile)) return true;
  const outMtime = fs.statSync(outFile).mtimeMs;
  const inputs = [
    ...listTsFiles(tuiDir),
    path.join(rootDir, 'package.json'),
    path.join(rootDir, 'package-lock.json'),
  ].filter((file) => fs.existsSync(file));
  return inputs.some((file) => fs.statSync(file).mtimeMs > outMtime);
}

function readProjectPhaseFromShell() {
  try {
    const content = fs.readFileSync(identityFile, 'utf8');
    const match = content.match(/^PROJECT_PHASE="([^"]+)"/m);
    return match ? match[1] : 'unknown';
  } catch {
    return 'unknown';
  }
}

function resolveProjectPhase() {
  const fromEnv = process.env.CANVA_PROJECT_PHASE?.trim();
  if (fromEnv) return fromEnv;
  return readProjectPhaseFromShell();
}

function ensureNpmDependencies() {
  const script = path.join(rootDir, 'scripts/ensure-npm-dependencies.sh');
  if (!fs.existsSync(script)) {
    console.error(`[error] Missing dependency bootstrap script: ${script}`);
    process.exit(1);
  }
  const result = spawnSync('bash', [script], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensureNpmDependencies();

if (needsBuild()) {
  const result = spawnSync('npm', ['run', 'build:tui'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

const run = spawnSync('node', ['.build/scripts/tui/index.js', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, CANVA_PROJECT_PHASE: resolveProjectPhase() },
});

process.exit(run.status ?? 0);
