import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const removedWrappers = [
  'scripts/build-runtime.js',
  'scripts/build-preload-bundle.js',
  'scripts/copy-runtime-assets.js',
  'scripts/clean-runtime-build.js',
  'scripts/electron-builder-before-build.js',
  'scripts/run-node-tests.js',
  'scripts/run-tui.js',
  'scripts/run-typescript-script.js',
] as const;

const requiredTypeScriptEntrypoints = [
  'scripts/build-runtime.ts',
  'scripts/build-preload-bundle.ts',
  'scripts/copy-runtime-assets.ts',
  'scripts/clean-runtime-build.ts',
  'scripts/electron-builder-before-build.ts',
  'scripts/run-node-tests.ts',
  'scripts/run-tui.ts',
  'scripts/run-ts-entry.sh',
] as const;

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const wrapper of removedWrappers) {
    if (fs.existsSync(path.join(rootDir, wrapper))) failures.push(`${wrapper}: compatibility JavaScript wrappers are no longer allowed`);
  }

  for (const entrypoint of requiredTypeScriptEntrypoints) {
    if (!fs.existsSync(path.join(rootDir, entrypoint))) failures.push(`${entrypoint}: missing TypeScript-first entrypoint`);
  }

  if (failures.length) {
    console.error('[typescript-wrapper-contract] FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log('[ok] TypeScript wrapper closure check passed');
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[typescript-wrapper-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
