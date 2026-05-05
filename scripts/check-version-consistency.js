#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'),'utf8'));
const identity = fs.readFileSync(path.join(root, 'scripts/app-identity-common.sh'),'utf8');
const mPhase = identity.match(/^PROJECT_PHASE="([^"]+)"/m);
if (!mPhase) { console.error('[error] PROJECT_PHASE not found'); process.exit(1); }
const expectedPhase = pkg.version.replace(/-dev\.(\d+)\.(\d+)$/, '.$1-dev.$2');
if (mPhase[1] !== expectedPhase) { console.error(`[error] PROJECT_PHASE mismatch: expected ${expectedPhase}, got ${mPhase[1]}`); process.exit(1); }
console.log('[ok] Version consistency check passed');
