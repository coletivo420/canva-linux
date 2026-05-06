import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type PackageJson = {
  scripts?: Record<string, string>;
};

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

const requiredStandaloneEntrypoints = [
  { source: 'scripts/build-runtime.ts', artifact: '.build/scripts/build-runtime.js' },
  { source: 'scripts/build-preload-bundle.ts', artifact: '.build/scripts/build-preload-bundle.js' },
  { source: 'scripts/copy-runtime-assets.ts', artifact: '.build/scripts/copy-runtime-assets.js' },
  { source: 'scripts/clean-runtime-build.ts', artifact: '.build/scripts/clean-runtime-build.js' },
  { source: 'scripts/electron-builder-before-build.ts', artifact: '.build/scripts/electron-builder-before-build.js' },
  { source: 'scripts/run-node-tests.ts', artifact: '.build/scripts/run-node-tests.js' },
  { source: 'scripts/run-tui.ts', artifact: '.build/scripts/run-tui.js' },
  { source: 'scripts/run-typescript-script.ts', artifact: '.build/scripts/run-typescript-script.js' },
] as const;

const requiredArtifactScripts = {
  test: '.build/scripts/run-node-tests.js',
  'build:preload': '.build/scripts/build-preload-bundle.js',
  'clean:runtime': '.build/scripts/clean-runtime-build.js',
  'build:runtime': '.build/scripts/build-runtime.js',
  tui: '.build/scripts/run-tui.js',
  'check:tui': '.build/scripts/run-tui.js',
} as const;

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const wrapper of removedWrappers) {
    if (fs.existsSync(path.join(rootDir, wrapper))) failures.push(`${wrapper}: compatibility JavaScript wrappers are no longer allowed`);
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as PackageJson;
  const packageScripts = packageJson.scripts ?? {};
  const standaloneBuild = packageScripts['build:scripts'] ?? '';

  for (const entrypoint of requiredStandaloneEntrypoints) {
    if (!fs.existsSync(path.join(rootDir, entrypoint.source))) failures.push(`${entrypoint.source}: missing TypeScript-first entrypoint`);
    if (!standaloneBuild.includes(entrypoint.source)) failures.push(`package.json build:scripts: must compile ${entrypoint.source}`);
  }

  if (!standaloneBuild.includes('--outdir=.build/scripts') || !standaloneBuild.includes('--entry-names=[name]')) {
    failures.push('package.json build:scripts: must emit generated entrypoints directly under .build/scripts');
  }

  for (const [scriptName, artifact] of Object.entries(requiredArtifactScripts)) {
    const command = packageScripts[scriptName] ?? '';
    if (!command.includes('build:scripts') || !command.includes(artifact)) {
      failures.push(`package.json scripts.${scriptName}: must build standalone TypeScript artifacts and run ${artifact}`);
    }
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
