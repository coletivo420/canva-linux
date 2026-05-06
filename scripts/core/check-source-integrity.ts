import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type PackageJson = {
  scripts?: Record<string, string>;
};

const skippedDirectories = new Set([
  '.build',
  '.flatpak-builder',
  '.git',
  'build-dir',
  'coverage',
  'dist',
  'node_modules',
  'repo',
  'test-results',
]);

function toRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/g, '/');
}

function collectFiles(rootDir: string, directory: string, output: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = toRelative(rootDir, absolutePath);

    if (entry.isDirectory()) {
      if (skippedDirectories.has(relativePath) || skippedDirectories.has(entry.name)) continue;
      collectFiles(rootDir, absolutePath, output);
      continue;
    }

    if (entry.isFile()) output.push(relativePath);
  }
}

function allSourceFiles(rootDir: string): string[] {
  const files: string[] = [];
  collectFiles(rootDir, rootDir, files);
  return files.sort((left, right) => left.localeCompare(right));
}

function validateJsonFile(rootDir: string, relativePath: string, failures: string[]): void {
  const absolutePath = path.join(rootDir, relativePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return;
  }

  if (relativePath === 'package.json' || relativePath === 'package-lock.json') {
    const expected = `${JSON.stringify(parsed, null, 2)}\n`;
    const actual = fs.readFileSync(absolutePath, 'utf8');
    if (actual !== expected) failures.push(`${relativePath}: must be normalized two-space JSON with a trailing newline`);
  }
}

function validatePackageScripts(rootDir: string, failures: string[]): void {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as PackageJson;
  for (const [scriptName, command] of Object.entries(packageJson.scripts ?? {})) {
    if (/\r|\n/.test(command)) failures.push(`package.json scripts.${scriptName}: command must stay on one line`);
    if (/(?:^|\s)(?:node\s+)?scripts\/[^\s]+\.js\b/.test(command)) failures.push(`package.json scripts.${scriptName}: must not call maintained scripts/*.js source`);
  }
}

function validateShellFile(rootDir: string, relativePath: string, failures: string[]): void {
  const result = spawnSync('bash', ['-n', relativePath], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    failures.push(`${relativePath}: failed to run bash -n (${result.error.message})`);
    return;
  }

  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    failures.push(`${relativePath}: shell syntax check failed${details ? `: ${details}` : ''}`);
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const files = allSourceFiles(rootDir);

  for (const file of files) {
    if (file.endsWith('.json')) validateJsonFile(rootDir, file, failures);
    if (file.endsWith('.sh')) validateShellFile(rootDir, file, failures);
  }

  validatePackageScripts(rootDir, failures);

  if (failures.length) {
    console.error('[source-integrity] FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log('[source-integrity] OK');
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[source-integrity] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
