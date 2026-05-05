#!/usr/bin/env node
import { findProjectRoot, loadActions } from './action-registry';

function expectedEnvFor(actionId: string, scope: string): [string, string] | null {
  if (actionId.includes('flatpak')) return ['CANVA_FLATPAK_SCOPE', scope];
  if (actionId.includes('native')) return ['CANVA_NATIVE_SCOPE', scope];
  return null;
}

export function main(): number {
  const actions = loadActions(findProjectRoot());
  const failures: string[] = [];
  const aliases = new Map<string, string>();

  for (const action of actions) {
    if (action.scope === 'system' && action.requiresRoot !== true) {
      failures.push(`${action.id}: system-scope actions must set requiresRoot=true`);
    }
    if (action.scope === 'user' && action.requiresRoot === true) {
      failures.push(`${action.id}: user-scope actions must not require root`);
    }
    if (action.scope) {
      const expected = expectedEnvFor(action.id, action.scope);
      if (expected) {
        const [key, value] = expected;
        if (action.env?.[key] !== value) failures.push(`${action.id}: expected env ${key}=${value}`);
      }
    }
    if (action.dangerous && !(action.confirmationTitle || action.confirmationMessage)) {
      failures.push(`${action.id}: dangerous actions must include confirmation metadata`);
    }
    if ((action.kind === 'planned' || action.planned) && ('command' in action && action.command || 'args' in action && action.args)) {
      failures.push(`${action.id}: planned actions must not define command/args`);
    }
    for (const alias of action.cli ?? []) {
      const existing = aliases.get(alias);
      if (existing) failures.push(`${action.id}: duplicate CLI alias ${alias} already used by ${existing}`);
      aliases.set(alias, action.id);
    }
  }

  if (failures.length) throw new Error(failures.join('\n'));
  console.log('[ok] Action contract check passed');
  return 0;
}

if (require.main === module && /check-action-contract\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
