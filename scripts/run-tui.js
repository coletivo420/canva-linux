#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = process.cwd();
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
  return listTsFiles(tuiDir).some((file) => fs.statSync(file).mtimeMs > outMtime);
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

if (needsBuild()) {
  const esbuildBin = path.join(rootDir, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
  const result = spawnSync(esbuildBin, [
    'scripts/tui/index.ts', '--bundle', '--platform=node', '--format=cjs', '--external:blessed', '--outfile=.build/scripts/tui/index.js',
  ], { stdio: 'inherit' });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

const run = spawnSync('node', ['.build/scripts/tui/index.js', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, CANVA_PROJECT_PHASE: process.env.CANVA_PROJECT_PHASE ?? readProjectPhaseFromShell() },
});

process.exit(run.status ?? 0);
