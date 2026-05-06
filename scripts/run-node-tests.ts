import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.env.CANVA_SCRIPT_REPO_ROOT || path.resolve(__dirname, '..');
const testDir = path.join(rootDir, 'test');

function collectNodeTestFiles(directory: string): string[] {
  const discovered: string[] = [];

  function walk(currentDirectory: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      throw error;
    }

    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .forEach((entry) => {
        const absolutePath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          walk(absolutePath);
          return;
        }

        if (entry.isFile() && entry.name.endsWith('.test.js')) {
          discovered.push(absolutePath);
        }
      });
  }

  walk(directory);
  return discovered.sort((left, right) => left.localeCompare(right));
}

export function main(): void {
  const testFiles = collectNodeTestFiles(testDir);

  if (testFiles.length === 0) {
    console.error('[error] No Node test files were found. Expected at least one *.test.js file under test/.');
    process.exit(1);
  }

  const relativeTestFiles = testFiles.map((file) => path.relative(rootDir, file));
  console.error(`[info] Running ${relativeTestFiles.length} Node test file(s).`);

  const result = spawnSync(process.execPath, ['--test', ...relativeTestFiles], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(`[error] Failed to start node --test: ${result.error.message}`);
    process.exit(1);
  }

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  if (result.signal) {
    console.error(`[error] node --test was terminated by ${result.signal}.`);
  }
  process.exit(1);
}

if (require.main === module) main();
