#!/usr/bin/env node
'use strict';

const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

const minimumDirectVersions = {
  electron: '41.5.0',
  'electron-builder': '26.8.1',
  eslint: '10.3.0',
};

const forbiddenDirectDependencies = {
  'eslint-plugin-import': 'does not declare ESLint 10 support; adapt lint rules instead of downgrading ESLint',
};

let failed = false;

function parseVersion(value) {
  const match = String(value || '').match(/\d+(?:\.\d+){0,2}/);
  if (!match) return null;

  const parts = match[0].split('.').map((part) => Number(part));
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function compareVersions(left, right) {
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }
  return 0;
}

for (const [name, minimum] of Object.entries(minimumDirectVersions)) {
  const actualRange = allDeps[name];
  const actual = parseVersion(actualRange);
  const expected = parseVersion(minimum);

  if (!actualRange || !actual || compareVersions(actual, expected) < 0) {
    console.error(`[dependency-policy] ${name} must stay on >= ${minimum}; found ${actualRange || 'missing'}`);
    failed = true;
  }
}

for (const [name, reason] of Object.entries(forbiddenDirectDependencies)) {
  if (allDeps[name]) {
    console.error(`[dependency-policy] ${name} is forbidden: ${reason}`);
    failed = true;
  }
}

if (pkg.build?.beforeBuild !== './scripts/electron-builder-before-build.js') {
  console.error('[dependency-policy] electron-builder beforeBuild hook must remain enabled for the current package layout');
  failed = true;
}

if (!fs.existsSync('scripts/electron-builder-before-build.js')) {
  console.error('[dependency-policy] missing scripts/electron-builder-before-build.js');
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log('[dependency-policy] OK');
