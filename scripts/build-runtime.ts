import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, '..');

type CommandArgs = readonly string[];

function run(label: string, command: string, args: CommandArgs): void {
  console.log(`[runtime-build] ${label}`);

  const result = spawnSync(command, [...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

export function main(): void {
  run('clean .build', 'bash', ['scripts/run-ts-entry.sh', 'scripts/clean-runtime-build.ts']);
  run('compile electron runtime', 'npx', ['tsc', '-p', 'tsconfig.build.json']);
  run('copy runtime assets', 'bash', ['scripts/run-ts-entry.sh', 'scripts/copy-runtime-assets.ts']);
  run('build electron-builder beforeBuild hook', 'npx', ['esbuild', 'scripts/electron-builder-before-build.ts', '--bundle', '--platform=node', '--target=node20', '--format=cjs', '--external:electron', '--external:esbuild', '--outfile=.build/scripts/bootstrap/electron-builder-before-build.js']);
  run('build preload bundle in .build', 'bash', [
    'scripts/run-ts-entry.sh',
    'scripts/build-preload-bundle.ts',
    '--build-output',
  ]);

  const requiredFiles = [
    '.build/electron/main/index.js',
    '.build/electron/preload/canva.bundle.js',
    '.build/electron/ui/toolbar.html',
    '.build/electron/assets',
  ];

  for (const file of requiredFiles) {
    const absolute = path.join(repoRoot, file);
    if (!fs.existsSync(absolute)) {
      console.error(`[runtime-build] missing required build artifact: ${file}`);
      process.exit(1);
    }
  }

  console.log('[runtime-build] OK');
}

if (require.main === module) main();
