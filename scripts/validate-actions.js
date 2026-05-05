#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { loadActions, validateActions } = require('./action-registry');

const rootDir = path.resolve(__dirname, '..');
const actions = loadActions();
validateActions(actions);

const cli = new Set();
for (const a of actions) {
  if (a.kind === 'command' && a.command === 'bash' && a.args?.[0]?.endsWith('.sh')) {
    const scriptPath = path.join(rootDir, a.args[0]);
    if (!fs.existsSync(scriptPath)) throw new Error(`Missing script for action: ${a.id}`);
    fs.accessSync(scriptPath, fs.constants.X_OK);
  }
  if (a.dangerous && !(a.confirmationTitle || a.confirmationMessage)) {
    throw new Error(`Dangerous action requires confirmation metadata: ${a.id}`);
  }
  if ((a.planned || a.kind === 'planned') && !a.description) {
    throw new Error(`Planned action must include description: ${a.id}`);
  }
  for (const alias of (a.cli || [])) {
    if (cli.has(alias)) throw new Error(`Duplicate CLI alias: ${alias}`);
    cli.add(alias);
  }
  if (a.group === 'development' && a.section === 'Package generation' && (a.planned || a.kind === 'planned')) {
    const d = (a.description || '').toLowerCase();
    if (!['aur', 'deb', 'rpm'].some((k) => d.includes(k))) {
      throw new Error(`Planned development package action must mention AUR/deb/rpm: ${a.id}`);
    }
  }
}

console.log('actions.json validation OK');
console.log(`Validated actions: ${actions.length}`);
console.log(`Validated CLI aliases: ${cli.size}`);
