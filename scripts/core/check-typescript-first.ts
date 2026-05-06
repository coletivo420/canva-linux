import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type PackageJson = {
  scripts?: Record<string, string>;
};

type WrapperKind = 'core' | 'typescript-script' | 'support';

type WrapperSummary = {
  relativePath: string;
  kind: WrapperKind;
  coreEntries: string[];
  tsImplementation?: string;
};

const supportJavaScriptFiles = new Set([
  'scripts/core-wrapper.js',
  'scripts/run-typescript-script.js',
  'scripts/run-node-tests.js',
]);

const acceptedJavaScriptFiles = new Set([
  ...supportJavaScriptFiles,
]);

const forbiddenCoreWrapperPatterns = [
  /fallback[A-Z0-9_]/,
  /function\s+fallback/i,
  /const\s+fallback/i,
  /let\s+fallback/i,
  /var\s+fallback/i,
  /overviewStatus/i,
  /statusItems/i,
  /detect(?:ion|ed)/i,
] as const;

function readText(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function pathExists(rootDir: string, relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function listTopLevelScriptJavaScript(rootDir: string): string[] {
  const scriptsDir = path.join(rootDir, 'scripts');
  return fs
    .readdirSync(scriptsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => `scripts/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
}

function parsePackageJson(rootDir: string): PackageJson {
  return JSON.parse(readText(rootDir, 'package.json')) as PackageJson;
}

function extractCoreEntriesFromWrapper(content: string): string[] {
  const entries = new Set<string>();
  for (const match of content.matchAll(/\b(?:loadCore|runCore)\(\s*['"]([a-z0-9-]+)['"]/g)) {
    entries.add(match[1]);
  }
  return [...entries].sort((left, right) => left.localeCompare(right));
}

function typeScriptScriptImplementation(relativePath: string): string {
  return relativePath.replace(/\.js$/, '.ts');
}

function classifyWrapper(rootDir: string, relativePath: string): WrapperSummary {
  const content = readText(rootDir, relativePath);
  const coreEntries = extractCoreEntriesFromWrapper(content);

  if (supportJavaScriptFiles.has(relativePath)) {
    return { relativePath, kind: 'support', coreEntries };
  }

  if (content.includes('runTypeScriptScript(__filename)') || content.includes('loadTypeScriptScript(__filename)')) {
    return {
      relativePath,
      kind: 'typescript-script',
      coreEntries,
      tsImplementation: typeScriptScriptImplementation(relativePath),
    };
  }

  if (coreEntries.length > 0) {
    return { relativePath, kind: 'core', coreEntries };
  }

  return { relativePath, kind: 'support', coreEntries };
}

function nonEmptyNonCommentLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#!') && !line.startsWith('//') && line !== "'use strict';");
}

function validateTopLevelScriptWrappers(rootDir: string, failures: string[]): WrapperSummary[] {
  const summaries: WrapperSummary[] = [];

  for (const relativePath of listTopLevelScriptJavaScript(rootDir)) {
    const content = readText(rootDir, relativePath);
    const summary = classifyWrapper(rootDir, relativePath);
    summaries.push(summary);

    if (summary.kind === 'support') {
      if (!acceptedJavaScriptFiles.has(relativePath)) {
        failures.push(`${relativePath}: JavaScript implementation files under scripts/ are not allowed; move logic to TypeScript and keep only a thin wrapper`);
      }
      continue;
    }

    if (summary.kind === 'core') {
      if (!content.includes("require('./core-wrapper')")) {
        failures.push(`${relativePath}: core wrapper must load ./core-wrapper`);
      }
      if (!content.includes('loadCore(') && !content.includes('runCore(')) {
        failures.push(`${relativePath}: core wrapper must delegate through loadCore(...) or runCore(...)`);
      }
      if (nonEmptyNonCommentLines(content).length > 12) {
        failures.push(`${relativePath}: core wrapper must stay thin; found ${nonEmptyNonCommentLines(content).length} non-empty code lines`);
      }
      for (const coreEntry of summary.coreEntries) {
        const tsPath = `scripts/core/${coreEntry}.ts`;
        if (!pathExists(rootDir, tsPath)) {
          failures.push(`${relativePath}: references missing TypeScript core implementation ${tsPath}`);
        }
      }
    }

    if (summary.kind === 'typescript-script') {
      if (!summary.tsImplementation || !pathExists(rootDir, summary.tsImplementation)) {
        failures.push(`${relativePath}: TypeScript-backed wrapper is missing ${summary.tsImplementation ?? typeScriptScriptImplementation(relativePath)}`);
      }
      if (nonEmptyNonCommentLines(content).length > 5) {
        failures.push(`${relativePath}: TypeScript-backed wrapper must stay thin; found ${nonEmptyNonCommentLines(content).length} non-empty code lines`);
      }
    }
  }

  return summaries;
}

function validateCheckWrappers(summaries: WrapperSummary[], failures: string[]): void {
  for (const summary of summaries) {
    if (!/^scripts\/check-.+\.js$/.test(summary.relativePath)) continue;
    if (summary.kind !== 'core') {
      failures.push(`${summary.relativePath}: check entrypoints must be thin core wrappers`);
    }
    if (summary.coreEntries.length !== 1) {
      failures.push(`${summary.relativePath}: check wrapper must reference exactly one scripts/core entry`);
    }
  }
}

function validateCoreWrapper(rootDir: string, failures: string[]): void {
  const relativePath = 'scripts/core-wrapper.js';
  const content = readText(rootDir, relativePath);

  if (!/module\.exports\s*=\s*\{\s*loadCore\s*,\s*runCore\s*\}/.test(content)) {
    failures.push(`${relativePath}: must only expose loadCore and runCore loader helpers`);
  }

  for (const pattern of forbiddenCoreWrapperPatterns) {
    if (pattern.test(content)) {
      failures.push(`${relativePath}: contains possible fallback or detection business logic matching ${pattern}`);
    }
  }
}

function extractBuildCoreEntries(packageJson: PackageJson): string[] {
  const buildCommand = packageJson.scripts?.['build:scripts-core'] ?? '';
  const entries = new Set<string>();
  for (const match of buildCommand.matchAll(/scripts\/core\/([a-z0-9-]+)\.ts/g)) {
    entries.add(match[1]);
  }
  return [...entries].sort((left, right) => left.localeCompare(right));
}

function extractBuiltCoreCommands(packageJson: PackageJson): string[] {
  const entries = new Set<string>();
  for (const command of Object.values(packageJson.scripts ?? {})) {
    for (const match of command.matchAll(/\.build\/scripts\/core\/([a-z0-9-]+)\.js/g)) {
      entries.add(match[1]);
    }
  }
  return [...entries].sort((left, right) => left.localeCompare(right));
}

function validatePackageCoreEntries(rootDir: string, packageJson: PackageJson, failures: string[]): string[] {
  const buildEntries = extractBuildCoreEntries(packageJson);
  const buildEntrySet = new Set(buildEntries);

  for (const entry of buildEntries) {
    const tsPath = `scripts/core/${entry}.ts`;
    if (!pathExists(rootDir, tsPath)) {
      failures.push(`package.json build:scripts-core: references missing ${tsPath}`);
    }
  }

  for (const entry of extractBuiltCoreCommands(packageJson)) {
    const tsPath = `scripts/core/${entry}.ts`;
    if (!pathExists(rootDir, tsPath)) {
      failures.push(`package.json: references missing compiled core source ${tsPath}`);
    }
    if (!buildEntrySet.has(entry)) {
      failures.push(`package.json: .build/scripts/core/${entry}.js is used but scripts/core/${entry}.ts is not in build:scripts-core`);
    }
  }

  return buildEntries;
}

function validateWrapperBuildCoverage(buildEntries: string[], summaries: WrapperSummary[], failures: string[]): void {
  const buildEntrySet = new Set(buildEntries);
  for (const summary of summaries) {
    for (const entry of summary.coreEntries) {
      if (!buildEntrySet.has(entry)) {
        failures.push(`${summary.relativePath}: references scripts/core/${entry}.ts but build:scripts-core does not compile it`);
      }
    }
  }
}

function validateTypescriptDocs(rootDir: string, buildEntries: string[], summaries: WrapperSummary[], failures: string[]): void {
  const docPath = 'docs/TYPESCRIPT.md';
  const content = readText(rootDir, docPath);

  for (const entry of buildEntries) {
    if (!content.includes(`${entry}.ts`)) {
      failures.push(`${docPath}: missing migrated scripts/core entry ${entry}.ts`);
    }
  }

  for (const summary of summaries) {
    if (summary.kind !== 'typescript-script' || !summary.tsImplementation) continue;
    const jsName = path.basename(summary.relativePath);
    const tsName = path.basename(summary.tsImplementation);
    if (!content.includes(jsName)) {
      failures.push(`${docPath}: missing TypeScript-backed wrapper ${jsName}`);
    }
    if (!content.includes(tsName)) {
      failures.push(`${docPath}: missing TypeScript implementation ${tsName}`);
    }
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const packageJson = parsePackageJson(rootDir);

  const summaries = validateTopLevelScriptWrappers(rootDir, failures);
  validateCheckWrappers(summaries, failures);
  validateCoreWrapper(rootDir, failures);
  const buildEntries = validatePackageCoreEntries(rootDir, packageJson, failures);
  validateWrapperBuildCoverage(buildEntries, summaries, failures);
  validateTypescriptDocs(rootDir, buildEntries, summaries, failures);

  if (failures.length) {
    console.error('[typescript-first] FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log('[ok] TypeScript-first guardrail check passed');
  return 0;
}

if (require.main === module && /check-typescript-first\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[typescript-first] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
