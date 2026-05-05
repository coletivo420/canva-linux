#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const actions = JSON.parse(fs.readFileSync(path.join(root, 'scripts/actions.json'), 'utf8'));
const actionIds = new Set(actions.map((a) => a.id));
const visibleMissingDescription = actions.filter((a) => a.planned !== true && a.kind === 'command' && ['install','development','maintenance'].includes(a.group) && (!a.description || !a.description.trim()));
if (visibleMissingDescription.length) {
  console.error('[error] Visible actions missing description:', visibleMissingDescription.map((a) => a.id).join(', '));
  process.exit(1);
}
const shell = fs.readFileSync(path.join(root, 'canva-linux.sh'), 'utf8');
const ids = [...shell.matchAll(/run_action_by_id\s+["']([^"']+)["']/g)].map((m) => m[1]);
const missing = ids.filter((id) => !actionIds.has(id));
if (missing.length) {
  console.error('[error] Shell references unknown action IDs:', [...new Set(missing)].join(', '));
  process.exit(1);
}
console.log('[ok] Shell action IDs validated against scripts/actions.json');
