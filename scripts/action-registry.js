const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const actionsFile = path.join(rootDir, 'scripts/actions.json');

const ALLOWED_GROUPS = new Set(['install', 'development', 'maintenance']);
const ALLOWED_SECTIONS = new Set(['Install', 'Package generation', 'Build', 'Validation', 'Maintenance', 'Uninstall']);
const ALLOWED_KINDS = new Set(['command', 'planned', 'internal']);

let _actions;

function loadActions() {
  if (_actions) return _actions;
  _actions = JSON.parse(fs.readFileSync(actionsFile, 'utf8'));
  validateActions(_actions);
  return _actions;
}

function shellQuote(part) {
  const text = String(part);
  if (text.length === 0) return "''";
  if (/[^A-Za-z0-9_/:=+,.@-]/.test(text)) return `'${text.replace(/'/g, `\'\\''`)}'`;
  return text;
}

function formatActionCommand(action) {
  if (!action?.command) return '';
  return [action.command, ...(Array.isArray(action.args) ? action.args : [])].map(shellQuote).join(' ');
}

function actionRequiresConfirmation(action) {
  if (!action) return false;
  return Boolean(action.dangerous || action.requiresConfirmation);
}

function validateActions(actions) {
  if (!Array.isArray(actions)) throw new Error('actions.json must contain an array');
  const ids = new Set();
  const cliAliases = new Set();

  for (const action of actions) {
    if (!action.id) throw new Error('Action missing id');
    if (!/^[a-z0-9-]+$/.test(action.id)) throw new Error(`Invalid action id format: ${action.id}`);
    if (ids.has(action.id)) throw new Error(`Duplicate action id: ${action.id}`);
    ids.add(action.id);

    if (!action.label) throw new Error(`Action missing label: ${action.id}`);
    if (!ALLOWED_GROUPS.has(action.group)) throw new Error(`Invalid action group: ${action.id} -> ${action.group}`);
    if (!ALLOWED_SECTIONS.has(action.section)) throw new Error(`Invalid action section: ${action.id} -> ${action.section}`);
    if (!ALLOWED_KINDS.has(action.kind)) throw new Error(`Unsupported action kind: ${action.id} -> ${action.kind}`);

    if (action.group === 'install' && action.section !== 'Install') throw new Error(`Group/section mismatch: ${action.id}`);
    if (action.group === 'development' && !['Package generation', 'Build', 'Validation'].includes(action.section)) throw new Error(`Group/section mismatch: ${action.id}`);
    if (action.group === 'maintenance' && !['Maintenance', 'Uninstall'].includes(action.section)) throw new Error(`Group/section mismatch: ${action.id}`);

    if (action.args !== undefined && !Array.isArray(action.args)) throw new Error(`Action args must be an array: ${action.id}`);

    if (action.kind === 'planned') {
      if (action.command || action.args) throw new Error(`Planned action must not define command/args: ${action.id}`);
    }
    if (action.kind === 'command') {
      if (!action.command) throw new Error(`Command action missing command: ${action.id}`);
      if (!Array.isArray(action.args)) throw new Error(`Command action args must be an array: ${action.id}`);
    }

    if (Array.isArray(action.cli)) {
      for (const alias of action.cli) {
        if (!alias.startsWith('--')) throw new Error(`CLI alias must start with --: ${action.id} -> ${alias}`);
        if (cliAliases.has(alias)) throw new Error(`Duplicate cli alias: ${alias}`);
        cliAliases.add(alias);
      }
    }

    if (action.dangerous && action.requiresConfirmation !== true) throw new Error(`Dangerous action must set requiresConfirmation=true: ${action.id}`);
    if (action.dangerous && !(action.description || action.confirmationMessage)) throw new Error(`Dangerous action missing description/confirmationMessage: ${action.id}`);
  }
}

const getActionsByGroup = (group) => loadActions().filter((a) => a.group === group);
const getActionById = (id) => loadActions().find((a) => a.id === id);
const getActionByCliFlag = (flag) => loadActions().find((a) => Array.isArray(a.cli) && a.cli.includes(flag));

module.exports = { loadActions, validateActions, getActionsByGroup, getActionById, getActionByCliFlag, actionRequiresConfirmation, formatActionCommand };
