import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type PackageJson = {
  scripts?: Record<string, string>;
  build?: { beforeBuild?: string };
};

const allowedJavaScriptPrefixes = [
  '.build/',
  'node_modules/',
] as const;

const sourceJavaScriptAllowlist = new Set([
  'electron/preload/canva.bundle.js',
]);

const nativeSourceExtensions = new Set([
  '.sh',
  '.json',
  '.yml',
  '.yaml',
  '.xml',
  '.desktop',
  '.html',
]);

const forbiddenSourceRoots = [
  'scripts/',
  'test/',
  'packaging/flathub/scripts/',
] as const;

const forbiddenConfigFiles = new Set([
  'eslint.config.js',
  'playwright.config.js',
]);

function toRelative(rootDir: string, absolutePath: string): string {
  return path.relative(rootDir, absolutePath).replace(/\\/g, '/');
}

function walkFiles(rootDir: string, directory: string, output: string[]): void {
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
      if (relativePath === '.git' || relativePath === 'node_modules' || relativePath === 'dist' || relativePath === 'repo' || relativePath === 'build-dir' || relativePath === '.flatpak-builder') continue;
      walkFiles(rootDir, absolutePath, output);
      continue;
    }
    if (entry.isFile()) output.push(relativePath);
  }
}

function allRepositoryFiles(rootDir: string): string[] {
  const files: string[] = [];
  walkFiles(rootDir, rootDir, files);
  return files.sort((left, right) => left.localeCompare(right));
}

function isAllowedGeneratedJavaScript(relativePath: string): boolean {
  return allowedJavaScriptPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function validateNoMaintainedJavaScript(files: string[], failures: string[]): void {
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    if (sourceJavaScriptAllowlist.has(file)) continue;
    if (isAllowedGeneratedJavaScript(file)) continue;
    failures.push(`${file}: maintained JavaScript source is not allowed; migrate it to TypeScript or generated .build output`);
  }
}

function validateRequiredTypeScriptEntrypoints(rootDir: string, failures: string[]): void {
  const required = [
    'eslint.config.ts',
    'playwright.config.ts',
    'scripts/run-node-tests.ts',
    'scripts/run-typescript-script.ts',
    'scripts/run-core-entry.sh',
    'packaging/flathub/scripts/generate-npm-sources.ts',
    'packaging/flathub/scripts/generate-npm-sources.sh',
  ] as const;

  for (const file of required) {
    if (!fs.existsSync(path.join(rootDir, file))) failures.push(`${file}: required TypeScript migration entrypoint is missing`);
  }
}

function validateForbiddenConfigs(rootDir: string, failures: string[]): void {
  for (const file of forbiddenConfigFiles) {
    if (fs.existsSync(path.join(rootDir, file))) failures.push(`${file}: JavaScript config is forbidden; use the .ts config`);
  }
}

function validatePackageScripts(rootDir: string, failures: string[]): void {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as PackageJson;
  const scripts = pkg.scripts ?? {};
  for (const [name, command] of Object.entries(scripts)) {
    const forbidden = command.match(/(?:^|\s)(?:node\s+)?(?:scripts|test|packaging\/flathub\/scripts)\/[^\s]+\.js\b/);
    if (forbidden) failures.push(`package.json scripts.${name}: invokes maintained JavaScript source (${forbidden[0].trim()})`);
  }

  if (pkg.build?.beforeBuild !== './.build/scripts/bootstrap/electron-builder-before-build.js') {
    failures.push('package.json build.beforeBuild: must point at generated .build TypeScript output');
  }
}

function validateFlathubShell(rootDir: string, failures: string[]): void {
  const shellPath = 'packaging/flathub/scripts/generate-npm-sources.sh';
  const shellContent = fs.readFileSync(path.join(rootDir, shellPath), 'utf8');
  if (!shellContent.includes('generate-npm-sources.ts')) {
    failures.push(`${shellPath}: must invoke the TypeScript npm source generator`);
  }
}

function validateSourceRootExtensions(files: string[], failures: string[]): void {
  for (const file of files) {
    if (!forbiddenSourceRoots.some((root) => file.startsWith(root))) continue;
    const extension = path.extname(file);
    if (extension === '.ts' || nativeSourceExtensions.has(extension)) continue;
    failures.push(`${file}: unsupported maintained source extension under TypeScript-first roots`);
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const files = allRepositoryFiles(rootDir);

  validateNoMaintainedJavaScript(files, failures);
  validateSourceRootExtensions(files, failures);
  validateForbiddenConfigs(rootDir, failures);
  validateRequiredTypeScriptEntrypoints(rootDir, failures);
  validatePackageScripts(rootDir, failures);
  validateFlathubShell(rootDir, failures);

  if (failures.length) {
    console.error('[typescript-first] FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log('[ok] TypeScript-first source policy passed');
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[typescript-first] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
