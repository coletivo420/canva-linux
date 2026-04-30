#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const copies = [
  ['electron/assets', '.build/electron/assets'],
  ['electron/ui', '.build/electron/ui'],
];

for (const [from, to] of copies) {
  const source = path.join(repoRoot, from);
  const target = path.join(repoRoot, to);

  if (!fs.existsSync(source)) {
    console.log(`[runtime-build] skip missing ${from}`);
    continue;
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });

  console.log(`[runtime-build] copied ${from} -> ${to}`);
}
