#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { loadActions, validateActions } = require('./action-registry');

const rootDir = path.resolve(__dirname, '..');
const actions = loadActions();
validateActions(actions);

for (const a of actions) {
  if (a.kind === 'command' && a.command === 'bash' && a.args?.[0]?.endsWith('.sh')) {
    const scriptPath = path.join(rootDir, a.args[0]);
    if (!fs.existsSync(scriptPath)) throw new Error(`Missing script for action: ${a.id}`);
    fs.accessSync(scriptPath, fs.constants.X_OK);
  }
}

console.log('actions.json validation OK');
