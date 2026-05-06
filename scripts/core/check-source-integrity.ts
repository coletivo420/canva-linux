import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type PackageJson = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
};

type PackageLockJson = {
  name?: string;
  version?: string;
  lockfileVersion?: number;
  packages?: { '': { name?: string; version?: string } };
};

const requiredJsonFiles = [
  'package.json',
  'package-lock.json',
] as const;

const requiredShellFiles = [
  'canva-linux.sh',
  'scripts/validate-project.sh',
  'scripts/run-core-entry.sh',
] as const;

const centralDocumentationFiles = [
  'README.md',
  'CHANGELOG.md',
  'REVIEW.md',
  'docs/README.md',
  'docs/TYPESCRIPT.md',
  'docs/VALIDATION.md',
  'docs/FLATHUB.md',
] as const;

const criticalMultilineFiles = [
  ...requiredShellFiles,
  ...centralDocumentationFiles,
] as const;

const maxDocumentationLineLength = 2000;

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

function readJsonFile<T>(rootDir: string, relativePath: string, failures: string[]): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8')) as T;
  } catch (error) {
    failures.push(`${relativePath}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

function validateJsonFile(rootDir: string, relativePath: string, failures: string[]): void {
  const absolutePath = path.join(rootDir, relativePath);
  const parsed = readJsonFile<unknown>(rootDir, relativePath, failures);
  if (parsed === null) return;

  if (relativePath === 'package.json' || relativePath === 'package-lock.json') {
    const expected = `${JSON.stringify(parsed, null, 2)}\n`;
    const actual = fs.readFileSync(absolutePath, 'utf8');
    if (actual !== expected) failures.push(`${relativePath}: must be normalized two-space JSON with a trailing newline`);
  }
}

function validateRequiredFiles(rootDir: string, failures: string[]): void {
  for (const file of [...requiredJsonFiles, ...requiredShellFiles, ...centralDocumentationFiles]) {
    if (!fs.existsSync(path.join(rootDir, file))) failures.push(`${file}: required validation target is missing`);
  }
}

function lineNumberOfLongestLine(lines: string[]): number {
  let longestLine = 0;
  let longestLength = -1;

  lines.forEach((line, index) => {
    if (line.length > longestLength) {
      longestLine = index + 1;
      longestLength = line.length;
    }
  });

  return longestLine;
}

function validateCriticalTextShape(rootDir: string, relativePath: string, failures: string[]): void {
  const content = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const lines = content.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (content.length > 500 && nonEmptyLines.length < 3) {
    failures.push(`${relativePath}: critical shell/doc file appears collapsed or minified; expected readable multiline content`);
  }

  if (relativePath.endsWith('.md')) {
    const longestLine = Math.max(...lines.map((line) => line.length), 0);
    if (longestLine > maxDocumentationLineLength) {
      failures.push(`${relativePath}:${lineNumberOfLongestLine(lines)}: documentation line is too long (${longestLine} characters); avoid giant one-line blocks`);
    }
  }
}

function validatePackageLockConsistency(rootDir: string, failures: string[]): void {
  const packageJson = readJsonFile<PackageJson>(rootDir, 'package.json', failures);
  const packageLock = readJsonFile<PackageLockJson>(rootDir, 'package-lock.json', failures);
  if (!packageJson || !packageLock) return;

  if (typeof packageLock.lockfileVersion !== 'number') failures.push('package-lock.json: missing numeric lockfileVersion');
  if (packageJson.name && packageLock.name && packageJson.name !== packageLock.name) failures.push('package-lock.json: root name must match package.json');
  if (packageJson.version && packageLock.version && packageJson.version !== packageLock.version) failures.push('package-lock.json: root version must match package.json');

  const rootPackage = packageLock.packages?.[''];
  if (!rootPackage) {
    failures.push('package-lock.json: missing packages[""] root package metadata');
    return;
  }

  if (packageJson.name && rootPackage.name !== packageJson.name) failures.push('package-lock.json packages[""].name must match package.json');
  if (packageJson.version && rootPackage.version !== packageJson.version) failures.push('package-lock.json packages[""].version must match package.json');
}

function validatePackageScripts(rootDir: string, failures: string[]): void {
  const packageJson = readJsonFile<PackageJson>(rootDir, 'package.json', failures);
  if (!packageJson) return;
  for (const [scriptName, command] of Object.entries(packageJson.scripts ?? {})) {
    if (/\r|\n/.test(command)) failures.push(`package.json scripts.${scriptName}: command must stay on one line`);
    if (/(?:^|\s)(?:node\s+)?scripts\/[^\s]+\.js\b/.test(command)) failures.push(`package.json scripts.${scriptName}: must not call maintained scripts/*.js source`);
  }
}

function validateShellShape(rootDir: string, relativePath: string, failures: string[]): void {
  const content = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const lines = content.split(/\r?\n/);

  if (content.startsWith('#!') && content.length > 200 && lines.length < 5) {
    failures.push(`${relativePath}: shell file appears collapsed; expected multiple lines with command separators/heredocs preserved`);
  }

  lines.forEach((line, index) => {
    const heredocMatch = line.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
    if (!heredocMatch) return;

    const delimiter = heredocMatch[1];
    const afterDelimiter = line.slice((heredocMatch.index ?? 0) + heredocMatch[0].length).trim();
    if (afterDelimiter.length > 0) failures.push(`${relativePath}:${index + 1}: heredoc delimiter ${delimiter} must be the final token on its own command line`);

    const hasTerminator = lines.slice(index + 1).some((candidate) => candidate.trim() === delimiter);
    if (!hasTerminator) failures.push(`${relativePath}:${index + 1}: heredoc delimiter ${delimiter} has no terminator line`);
  });
}

function validateShellFile(rootDir: string, relativePath: string, failures: string[]): void {
  validateShellShape(rootDir, relativePath, failures);

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

  validateRequiredFiles(rootDir, failures);

  for (const file of files) {
    if (file.endsWith('.json')) validateJsonFile(rootDir, file, failures);
    if (file.endsWith('.sh')) validateShellFile(rootDir, file, failures);
    if (file.endsWith('.md')) validateCriticalTextShape(rootDir, file, failures);
  }

  for (const file of criticalMultilineFiles) {
    if (!files.includes(file)) continue;
    if (!file.endsWith('.md')) validateCriticalTextShape(rootDir, file, failures);
  }

  validatePackageLockConsistency(rootDir, failures);
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
