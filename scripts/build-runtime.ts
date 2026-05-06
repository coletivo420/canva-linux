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
  run('clean .build', process.execPath, ['.build/scripts/clean-runtime-build.js']);
  run('rebuild script artifacts after clean', 'npm', ['run', 'build:scripts']);
  run('compile electron runtime', 'npx', ['tsc', '-p', 'tsconfig.build.json']);
  run('copy runtime assets', process.execPath, ['.build/scripts/copy-runtime-assets.js']);
  run('build electron-builder beforeBuild hook', 'npx', ['esbuild', 'scripts/electron-builder-before-build.ts', '--bundle', '--platform=node', '--target=node22', '--format=cjs', '--external:electron', '--external:esbuild', '--outfile=.build/scripts/bootstrap/electron-builder-before-build.js']);
  run('build preload bundle in .build', process.execPath, [
    '.build/scripts/build-preload-bundle.js',
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
