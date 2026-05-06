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

        if (entry.isFile() && entry.name.endsWith('.test.ts')) {
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
    console.error('[error] No Node test files were found. Expected at least one *.test.ts file under test/.');
    process.exit(1);
  }

  const relativeTestFiles = testFiles.map((file) => path.relative(rootDir, file));
  console.error(`[info] Running ${relativeTestFiles.length} Node test file(s).`);

  const registerHook = path.join(rootDir, '.build/scripts/bootstrap/register-typescript.js');
  const result = spawnSync('npx', ['esbuild', 'scripts/register-typescript.ts', '--bundle', '--platform=node', '--target=node20', '--format=cjs', '--external:typescript', `--outfile=${registerHook}`, '--log-level=warning'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (result.error || result.status !== 0) {
    console.error(`[error] Failed to build TypeScript test hook${result.error ? `: ${result.error.message}` : ''}`);
    process.exit(result.status || 1);
  }

  const testResult = spawnSync(process.execPath, ['--require', registerHook, '--test', ...process.argv.slice(2), ...relativeTestFiles], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });

  if (testResult.error) {
    console.error(`[error] Failed to start node --test: ${testResult.error.message}`);
    process.exit(1);
  }

  if (typeof testResult.status === 'number') {
    process.exit(testResult.status);
  }

  if (testResult.signal) {
    console.error(`[error] node --test was terminated by ${testResult.signal}.`);
  }
  process.exit(1);
}

if (require.main === module) main();
