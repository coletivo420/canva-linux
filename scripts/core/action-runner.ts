#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  actionRequiresConfirmation,
  findProjectRoot,
  formatActionCommand,
  getActionByCliFlag,
  getActionById,
  loadActions,
  type CanvaAction,
} from './action-registry';

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

function printSummary(actions: CanvaAction[]) {
  const groups = ['install', 'development', 'maintenance'] as const;
  for (const group of groups) {
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

export function main(argv = process.argv.slice(2)): number {
  const rootDir = findProjectRoot();
  const has = (flag: string) => argv.includes(flag);
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    if (index === -1) return undefined;
    const candidate = argv[index + 1];
    if (!candidate || (flag !== '--cli' && candidate.startsWith('--'))) {
      console.error(`[error] Missing value for ${flag}.`);
      return undefined;
    }
    return candidate;
  };

  const failIfMissingValue = (flag: string) => {
    const result = value(flag);
    if (!result) process.exit(1);
    return result;
  };

  const actions = loadActions(rootDir);
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

  let action: CanvaAction | undefined;
  if (has('--id')) {
    const id = failIfMissingValue('--id');
    action = getActionById(id, rootDir);
    if (!action) {
      console.error(`[error] Action not found: ${id}`);
      return 1;
    }
  } else if (has('--cli')) {
    const flag = failIfMissingValue('--cli');
    action = getActionByCliFlag(flag, rootDir);
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
    cwd: rootDir,
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

if (require.main === module && /action-runner\.js$/.test(process.argv[1] || '')) {
  process.exit(main());
}
