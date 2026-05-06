import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const requiredIgnoredPaths = [
  '.build/generated.js',
  'dist/generated.js',
  'build-dir/generated',
  'repo/generated',
  '.flatpak-builder/generated',
] as const;

const generatedOutputJavaScriptPaths = [
  '.build/generated.js',
  'dist/generated.js',
  'out/generated.js',
  'release/generated.js',
  'coverage/generated.js',
] as const;

const sourceJavaScriptProbePaths = [
  'scripts/source-regression.js',
  'electron/main/source-regression.js',
  'test/source-regression.test.js',
  'packaging/flathub/scripts/source-regression.js',
  'eslint.config.js',
  'playwright.config.js',
] as const;

const requiredVersionedPaths = [
  'eslint.config.ts',
  'playwright.config.ts',
  'tsconfig.json',
  'tsconfig.build.json',
  'tsconfig.strict.json',
  'package-lock.json',
  'scripts/actions.json',
  'scripts/theme.json',
  'scripts/project-ui.json',
  'io.github.coletivo420.canva-linux.yml',
  'packaging/flathub/manifest.yml',
  'packaging/flathub/generated-sources.json',
  'packaging/flathub/scripts/generate-npm-sources.ts',
  'data/io.github.coletivo420.canva-linux.desktop',
  'data/io.github.coletivo420.canva-linux.metainfo.xml',
  'data/icons/hicolor/128x128/apps/io.github.coletivo420.canva-linux.png',
  'docs/README.md',
  'README.md',
  'CHANGELOG.md',
  'REVIEW.md',
] as const;

function gitCheckIgnore(rootDir: string, candidatePath: string): boolean {
  const result = spawnSync('git', ['check-ignore', '--no-index', candidatePath], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status === 0) return true;
  if (result.status === 1) return false;

  const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
  throw new Error(`git check-ignore failed for ${candidatePath}${details ? `: ${details}` : ''}`);
}

function gitTrackedFiles(rootDir: string, pathspec: string): string[] {
  const result = spawnSync('git', ['ls-files', '-z', pathspec], {
    cwd: rootDir,
    encoding: 'buffer',
    shell: false,
  });

  if (result.status !== 0) {
    const details = Buffer.concat([result.stderr, result.stdout]).toString('utf8').trim();
    throw new Error(`git ls-files failed for ${pathspec}${details ? `: ${details}` : ''}`);
  }

  return result.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function validateGitignoreShape(rootDir: string, failures: string[]): void {
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    failures.push('.gitignore: missing required ignore policy file');
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length < 20) {
    failures.push('.gitignore: appears collapsed; expected a multiline file with one pattern or comment per line');
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    if (/\s+#/.test(line)) {
      failures.push(`.gitignore:${index + 1}: comments must start on their own line`);
    }

    if (/\s/.test(trimmed)) {
      failures.push(`.gitignore:${index + 1}: expected one ignore pattern per line`);
    }

    if (trimmed === '*.js' || trimmed === '**/*.js' || trimmed.endsWith('/*.js')) {
      failures.push(`.gitignore:${index + 1}: do not ignore source JavaScript globally or by source root; TypeScript migration checks must see it`);
    }
  });
}

function validateIgnored(rootDir: string, failures: string[]): void {
  for (const requiredPath of requiredIgnoredPaths) {
    if (!gitCheckIgnore(rootDir, requiredPath)) failures.push(`${requiredPath}: required generated output path is not ignored by .gitignore`);
  }

  for (const generatedPath of generatedOutputJavaScriptPaths) {
    if (!gitCheckIgnore(rootDir, generatedPath)) failures.push(`${generatedPath}: generated JavaScript output path must be ignored`);
  }
}

function validateNotIgnored(rootDir: string, candidatePaths: string[], label: string, failures: string[]): void {
  for (const candidatePath of candidatePaths) {
    if (gitCheckIgnore(rootDir, candidatePath)) failures.push(`${candidatePath}: ${label} must not be ignored by .gitignore`);
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  validateGitignoreShape(rootDir, failures);
  validateIgnored(rootDir, failures);
  validateNotIgnored(rootDir, gitTrackedFiles(rootDir, 'scripts/**/*.ts'), 'source TypeScript files', failures);
  validateNotIgnored(rootDir, gitTrackedFiles(rootDir, 'electron/**/*.ts'), 'runtime TypeScript files', failures);
  validateNotIgnored(rootDir, gitTrackedFiles(rootDir, 'test/**/*.ts'), 'TypeScript tests', failures);
  validateNotIgnored(rootDir, [...requiredVersionedPaths], 'versioned source, config, docs, or Flathub submission files', failures);
  validateNotIgnored(rootDir, [...sourceJavaScriptProbePaths], 'source JavaScript must remain visible to TypeScript migration checks', failures);

  if (failures.length) {
    console.error('[gitignore-policy] FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log('[ok] Gitignore policy passed');
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[gitignore-policy] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
