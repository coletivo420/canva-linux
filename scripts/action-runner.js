#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { loadActions, getActionById, getActionByCliFlag, actionRequiresConfirmation, formatActionCommand } = require('./action-registry');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function has(flag) { return args.includes(flag); }
function value(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  const v = args[i + 1];
  if (!v || (flag !== '--cli' && v.startsWith('--'))) {
    console.error(`[error] Missing value for ${flag}.`);
    process.exit(1);
  }
  return v;
}
function resolveAction() {
  if (has('--id')) {
    const id = value('--id');
    const action = getActionById(id);
    if (!action) { console.error(`[error] Action not found: ${id}`); process.exit(1); }
    return action;
  }
  if (has('--cli')) {
    const flag = value('--cli');
    const action = getActionByCliFlag(flag);
    if (!action) { console.error(`[error] Action not found for CLI flag: ${flag}`); process.exit(1); }
    return action;
  }
  return null;
}
function printHelp() { console.log(`Canva Linux Action Runner\n\nUsage:\n  node scripts/action-runner.js --list\n  node scripts/action-runner.js --list-ids\n  node scripts/action-runner.js --group <name>\n  node scripts/action-runner.js --id <action-id> [--dry-run] [--yes]\n  node scripts/action-runner.js --cli <flag> [--dry-run] [--yes]\n  node scripts/action-runner.js --id <action-id> --requires-confirmation\n\nOptions:\n  --help                    Show this help\n  --list                    List full actions JSON\n  --list-ids                List action ids\n  --group <name>            List actions by group\n  --id <action-id>          Resolve action by id\n  --cli <flag>              Resolve action by CLI flag\n  --dry-run                 Print resolved action and command\n  --requires-confirmation   Exit 0 if action requires confirmation, else 1\n  --yes                     Confirm dangerous action execution\n`); }

if (has('--help')) { printHelp(); process.exit(0); }
if (has('--list')) { console.log(JSON.stringify(loadActions(), null, 2)); process.exit(0); }
if (has('--list-ids')) { console.log(loadActions().map((a) => a.id).join('\n')); process.exit(0); }
if (has('--group')) { const group = value('--group'); console.log(JSON.stringify(loadActions().filter((a) => a.group === group), null, 2)); process.exit(0); }

const action = resolveAction();
if (!action) { printHelp(); process.exit(1); }

if (has('--requires-confirmation')) process.exit(actionRequiresConfirmation(action) ? 0 : 1);
if (has('--dry-run')) {
  console.log(`Action:\n  ${action.id}\n\nCommand:\n  ${formatActionCommand(action) || '(planned)'}\n\nDangerous:\n  ${Boolean(action.dangerous)}\n\nLong running:\n  ${Boolean(action.longRunning)}`);
  process.exit(0);
}

if (action.kind === 'planned' || action.planned) { console.log(`[planned] ${action.description || `${action.label} is not implemented in this phase.`}`); process.exit(0); }
if (actionRequiresConfirmation(action) && !has('--yes')) { console.error(`[error] Action requires confirmation: ${action.label}`); console.error('[info] Re-run with --yes after confirming intent.'); process.exit(1); }

const r = spawnSync(action.command, action.args || [], { cwd: rootDir, stdio: 'inherit', env: process.env, shell: false });
if (r.error) { console.error('[error] Failed to start process: ' + r.error.message); process.exit(1); }
process.exit(r.status ?? 1);
