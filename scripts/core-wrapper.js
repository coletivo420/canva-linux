const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const fallbackRootDir = rootDir;

function builtPath(entryName) {
  return path.join(rootDir, '.build/scripts/core', `${entryName}.js`);
}

function buildScriptsCore({ reportFailure = true } = {}) {
  const result = spawnSync('npm', ['run', 'build:scripts-core', '--silent'], {
    cwd: rootDir,
    stdio: ['ignore', 'ignore', 'pipe'],
    encoding: 'utf8',
    shell: false,
  });
  if ((result.status ?? 1) !== 0) {
    if (reportFailure) {
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.error) process.stderr.write(`${result.error.message}\n`);
      process.stderr.write('[error] scripts-core build is missing or failed. Run npm run build:scripts-core.\n');
    }
    return false;
  }
  return true;
}

function loadCore(entryName) {
  const target = builtPath(entryName);
  if (!fs.existsSync(target) && !buildScriptsCore({ reportFailure: !hasFallbackCore(entryName) })) {
    return fallbackCore(entryName);
  }
  return require(target);
}

const ACTION_GROUPS = ['install', 'development', 'maintenance'];
const ACTION_SECTIONS = ['Install', 'Package generation', 'Build', 'Validation', 'Maintenance', 'Uninstall'];
const ACTION_KINDS = ['command', 'planned', 'internal'];
const INSTALL_SCOPES = ['system', 'user'];

const allowedGroups = new Set(ACTION_GROUPS);
const allowedSections = new Set(ACTION_SECTIONS);
const allowedKinds = new Set(ACTION_KINDS);
const allowedScopes = new Set(INSTALL_SCOPES);

let cachedRoot = null;
let cachedActions = null;

function hasProjectMarkers(dir) {
  return fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'scripts/actions.json'));
}

function findProjectRoot(startDir = fallbackRootDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (hasProjectMarkers(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return fallbackRootDir;
    current = parent;
  }
}

function fallbackActionsPath(root = findProjectRoot()) {
  return path.join(root, 'scripts/actions.json');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertString(value, message) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message);
}

function assertStringArray(value, message) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new Error(message);
}

function assertOptionalBoolean(action, key) {
  if (action[key] !== undefined && typeof action[key] !== 'boolean') {
    throw new Error(`Action ${key} must be boolean: ${String(action.id)}`);
  }
}

function assertOptionalString(action, key) {
  if (action[key] !== undefined && typeof action[key] !== 'string') {
    throw new Error(`Action ${key} must be string: ${String(action.id)}`);
  }
}

function validateActionEnv(action) {
  if (action.env === undefined) return;
  if (!isObject(action.env)) throw new Error(`Action env must be an object: ${String(action.id)}`);
  for (const [key, value] of Object.entries(action.env)) {
    if (!key.trim()) throw new Error(`Action env contains an empty key: ${String(action.id)}`);
    if (typeof value !== 'string') throw new Error(`Action env value must be string: ${String(action.id)} -> ${key}`);
  }
}

function validateActions(actions) {
  if (!Array.isArray(actions)) throw new Error('actions.json must contain an array');
  const ids = new Set();
  const cliAliases = new Set();

  for (const item of actions) {
    if (!isObject(item)) throw new Error('Action entries must be objects');
    assertString(item.id, 'Action missing id');
    if (!/^[a-z0-9-]+$/.test(item.id)) throw new Error(`Invalid action id format: ${item.id}`);
    if (ids.has(item.id)) throw new Error(`Duplicate action id: ${item.id}`);
    ids.add(item.id);

    assertString(item.label, `Action missing label: ${item.id}`);
    assertString(item.group, `Action missing group: ${item.id}`);
    assertString(item.section, `Action missing section: ${item.id}`);
    assertString(item.kind, `Action missing kind: ${item.id}`);

    if (!allowedGroups.has(item.group)) throw new Error(`Invalid action group: ${item.id} -> ${item.group}`);
    if (!allowedSections.has(item.section)) throw new Error(`Invalid action section: ${item.id} -> ${item.section}`);
    if (!allowedKinds.has(item.kind)) throw new Error(`Unsupported action kind: ${item.id} -> ${item.kind}`);

    if (item.group === 'install' && item.section !== 'Install') throw new Error(`Group/section mismatch: ${item.id}`);
    if (item.group === 'development' && !['Package generation', 'Build', 'Validation'].includes(item.section)) throw new Error(`Group/section mismatch: ${item.id}`);
    if (item.group === 'maintenance' && !['Maintenance', 'Uninstall'].includes(item.section)) throw new Error(`Group/section mismatch: ${item.id}`);

    if (item.args !== undefined) assertStringArray(item.args, `Action args must be an array: ${item.id}`);
    if (item.cli !== undefined) assertStringArray(item.cli, `Action cli aliases must be an array: ${item.id}`);
    if (item.scope !== undefined && (typeof item.scope !== 'string' || !allowedScopes.has(item.scope))) {
      throw new Error(`Action scope must be system or user: ${item.id}`);
    }

    for (const key of ['hidden', 'longRunning', 'dangerous', 'planned', 'requiresConfirmation', 'requiresRoot']) {
      assertOptionalBoolean(item, key);
    }
    for (const key of ['command', 'description', 'confirmationTitle', 'confirmationMessage', 'confirmationPhrase', 'warning']) {
      assertOptionalString(item, key);
    }
    validateActionEnv(item);

    if (item.kind === 'planned') {
      if (item.command || item.args) throw new Error(`Planned action must not define command/args: ${item.id}`);
    }
    if (item.kind === 'command') {
      if (!item.command) throw new Error(`Command action missing command: ${item.id}`);
      if (!Array.isArray(item.args)) throw new Error(`Command action args must be an array: ${item.id}`);
    }

    for (const alias of item.cli ?? []) {
      if (!alias.startsWith('--')) throw new Error(`CLI alias must start with --: ${item.id} -> ${alias}`);
      if (cliAliases.has(alias)) throw new Error(`Duplicate cli alias: ${alias}`);
      cliAliases.add(alias);
    }

    if (item.dangerous && item.requiresConfirmation !== true) throw new Error(`Dangerous action must set requiresConfirmation=true: ${item.id}`);
    if (item.dangerous && !(item.description || item.confirmationMessage)) throw new Error(`Dangerous action missing description/confirmationMessage: ${item.id}`);
  }
}

function loadActions(root = findProjectRoot()) {
  const resolvedRoot = path.resolve(root);
  if (cachedActions && cachedRoot === resolvedRoot) return cachedActions;
  const actions = JSON.parse(fs.readFileSync(fallbackActionsPath(resolvedRoot), 'utf8'));
  validateActions(actions);
  cachedRoot = resolvedRoot;
  cachedActions = actions;
  return actions;
}

function shellQuote(part) {
  const text = String(part);
  if (text.length === 0) return "''";
  if (/[^A-Za-z0-9_/:=+,.@-]/.test(text)) return `'${text.replace(/'/g, "'\\''")}'`;
  return text;
}

function formatActionCommand(action) {
  if (!action || !('command' in action) || !action.command) return '';
  return [action.command, ...(Array.isArray(action.args) ? action.args : [])].map(shellQuote).join(' ');
}

function actionRequiresConfirmation(action) {
  return Boolean(action?.dangerous || action?.requiresConfirmation);
}

function getActionsByGroup(group, root = findProjectRoot()) {
  return loadActions(root).filter((action) => action.group === group && !action.hidden);
}

function getActionById(id, root = findProjectRoot()) {
  return loadActions(root).find((action) => action.id === id);
}

function getActionByCliFlag(flag, root = findProjectRoot()) {
  return loadActions(root).find((action) => Array.isArray(action.cli) && action.cli.includes(flag));
}

function printHelp() {
  console.log(`Canva Linux Action Runner

Usage:
  node scripts/action-runner.js --list
  node scripts/action-runner.js --list-ids
  node scripts/action-runner.js --group <name>
  node scripts/action-runner.js --id <action-id> [--dry-run] [--yes]
  node scripts/action-runner.js --cli <flag> [--dry-run] [--yes]
  node scripts/action-runner.js --id <action-id> --requires-confirmation

Options:
  --help                    Show this help
  --list                    List full actions JSON
  --list-ids                List action ids
  --group <name>            List actions by group
  --id <action-id>          Resolve action by id
  --cli <flag>              Resolve action by CLI flag
  --dry-run                 Print resolved action and command
  --requires-confirmation   Exit 0 if action requires confirmation, else 1
  --yes                     Confirm dangerous action execution
`);
}

function printSummary(actions) {
  for (const group of ACTION_GROUPS) {
    console.log(`${group[0].toUpperCase()}${group.slice(1)}:`);
    for (const action of actions.filter((item) => item.group === group)) {
      const flags = [];
      if (action.planned || action.kind === 'planned') flags.push('planned');
      if (action.dangerous) flags.push('dangerous');
      const suffix = flags.length ? ` [${flags.join(', ')}]` : '';
      console.log(`  ${action.id.padEnd(30)} ${action.label}${suffix}`);
    }
  }
}

function actionRunnerMain(argv = process.argv.slice(2)) {
  const projectRoot = findProjectRoot();
  const has = (flag) => argv.includes(flag);
  const value = (flag) => {
    const index = argv.indexOf(flag);
    if (index === -1) return undefined;
    const candidate = argv[index + 1];
    if (!candidate || (flag !== '--cli' && candidate.startsWith('--'))) {
      console.error(`[error] Missing value for ${flag}.`);
      return undefined;
    }
    return candidate;
  };

  const failIfMissingValue = (flag) => {
    const result = value(flag);
    if (!result) process.exit(1);
    return result;
  };

  const actions = loadActions(projectRoot);
  if (has('--help')) {
    printHelp();
    return 0;
  }
  if (has('--list')) {
    console.log(JSON.stringify(actions, null, 2));
    return 0;
  }
  if (has('--list-ids')) {
    console.log(actions.map((action) => action.id).join('\n'));
    return 0;
  }
  if (has('--group')) {
    const group = failIfMissingValue('--group');
    console.log(JSON.stringify(actions.filter((action) => action.group === group), null, 2));
    return 0;
  }
  if (has('--summary')) {
    printSummary(actions);
    return 0;
  }

  let action;
  if (has('--id')) {
    const id = failIfMissingValue('--id');
    action = getActionById(id, projectRoot);
    if (!action) {
      console.error(`[error] Action not found: ${id}`);
      return 1;
    }
  } else if (has('--cli')) {
    const flag = failIfMissingValue('--cli');
    action = getActionByCliFlag(flag, projectRoot);
    if (!action) {
      console.error(`[error] Action not found for CLI flag: ${flag}`);
      return 1;
    }
  }

  if (!action) {
    printHelp();
    return 1;
  }

  if (has('--requires-confirmation')) return actionRequiresConfirmation(action) ? 0 : 1;
  if (has('--dry-run')) {
    console.log(`Action:
  ${action.id}

Command:
  ${formatActionCommand(action) || '(planned)'}

Dangerous:
  ${Boolean(action.dangerous)}

Long running:
  ${Boolean(action.longRunning)}`);
    return 0;
  }

  if (action.kind === 'planned' || action.planned) {
    console.log(`[planned] ${action.description || `${action.label} is not implemented in this phase.`}`);
    return 0;
  }
  if (actionRequiresConfirmation(action) && !has('--yes')) {
    console.error(`[error] Action requires confirmation: ${action.label}`);
    console.error('[info] Re-run with --yes after confirming intent.');
    return 1;
  }
  if (action.kind !== 'command') {
    console.error(`[error] Action is not executable: ${action.id}`);
    return 1;
  }

  const result = spawnSync(action.command, action.args || [], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, ...(action.env || {}) },
    shell: false,
  });
  if (result.error) {
    console.error(`[error] Failed to start process: ${result.error.message}`);
    return 1;
  }
  return result.status ?? 1;
}

const fallbackRegistryCore = {
  findProjectRoot,
  loadActions,
  validateActions,
  formatActionCommand,
  actionRequiresConfirmation,
  getActionsByGroup,
  getActionById,
  getActionByCliFlag,
};

const fallbackCores = {
  'action-registry': fallbackRegistryCore,
  'action-runner': { main: actionRunnerMain },
};

function hasFallbackCore(entryName) {
  return Object.prototype.hasOwnProperty.call(fallbackCores, entryName);
}

function fallbackCore(entryName) {
  return fallbackCores[entryName] ?? null;
}

function readProjectField(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function fallbackOverviewStatus() {
  const pkg = readProjectField('package.json', {});
  let phase = 'unknown';
  try {
    const identity = fs.readFileSync(path.join(rootDir, 'scripts/app-identity-common.sh'), 'utf8');
    const match = identity.match(/^PROJECT_PHASE="([^"]+)"/m);
    if (match) phase = match[1];
  } catch {
    phase = 'unknown';
  }
  return {
    package: {
      version: typeof pkg.version === 'string' ? pkg.version : 'unknown',
      phase,
      appId: 'io.github.coletivo420.canva-linux',
      executable: 'canva-linux',
      repository: 'https://github.com/coletivo420/canva-linux',
    },
    installations: {
      nativeSystem: false,
      nativeUser: false,
      flatpakSystem: false,
      flatpakUser: false,
      appImageArtifacts: false,
      nativeSystemVersion: '',
      nativeUserVersion: '',
      flatpakSystemVersion: '',
      flatpakUserVersion: '',
      appImageVersion: '',
    },
  };
}

module.exports = { loadCore, fallbackOverviewStatus };
