import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type WrapperKind = 'run' | 'load-default';

type WrapperContract = {
  js: string;
  ts: string;
  kind: WrapperKind;
};

const wrapperContracts: readonly WrapperContract[] = [
  { js: 'scripts/build-runtime.js', ts: 'scripts/build-runtime.ts', kind: 'run' },
  { js: 'scripts/build-preload-bundle.js', ts: 'scripts/build-preload-bundle.ts', kind: 'run' },
  { js: 'scripts/copy-runtime-assets.js', ts: 'scripts/copy-runtime-assets.ts', kind: 'run' },
  { js: 'scripts/clean-runtime-build.js', ts: 'scripts/clean-runtime-build.ts', kind: 'run' },
  { js: 'scripts/electron-builder-before-build.js', ts: 'scripts/electron-builder-before-build.ts', kind: 'load-default' },
  { js: 'scripts/run-node-tests.js', ts: 'scripts/run-node-tests.ts', kind: 'run' },
  { js: 'scripts/run-tui.js', ts: 'scripts/run-tui.ts', kind: 'run' },
] as const;

const forbiddenWrapperLogicPatterns = [
  /\bspawn(?:Sync)?\b/,
  /\bexec(?:File|FileSync|Sync)?\b/,
  /\bfs\./,
  /\bmkdir(?:Sync)?\b/,
  /\brm(?:Sync)?\b/,
  /\bcp(?:Sync)?\b/,
  /\besbuild\.build/,
] as const;

function nonEmptyNonCommentLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#!') && !line.startsWith('//'));
}

function validateRunWrapper(rootDir: string, contract: WrapperContract, content: string, failures: string[]): void {
  if (!content.includes("require('./run-typescript-script').runTypeScriptScript(__filename)")) {
    failures.push(`${contract.js}: must delegate to runTypeScriptScript(__filename)`);
  }

  const lines = nonEmptyNonCommentLines(content);
  if (lines.length > 3) {
    failures.push(`${contract.js}: wrapper must stay thin; found ${lines.length} non-empty lines`);
  }

  validateNoDuplicatedWrapperLogic(contract, content, failures);
  validateTsExportsMain(rootDir, contract, failures);
}

function validateLoadDefaultWrapper(rootDir: string, contract: WrapperContract, content: string, failures: string[]): void {
  if (!content.includes("require('./run-typescript-script').loadTypeScriptScript(__filename)")) {
    failures.push(`${contract.js}: must delegate to loadTypeScriptScript(__filename)`);
  }

  if (!content.includes('exports.default')) {
    failures.push(`${contract.js}: must expose the electron-builder default hook`);
  }

  const lines = nonEmptyNonCommentLines(content);
  if (lines.length > 5) {
    failures.push(`${contract.js}: wrapper must stay thin; found ${lines.length} non-empty lines`);
  }

  validateNoDuplicatedWrapperLogic(contract, content, failures);
  validateTsExportsDefault(rootDir, contract, failures);
}

function validateNoDuplicatedWrapperLogic(contract: WrapperContract, content: string, failures: string[]): void {
  for (const pattern of forbiddenWrapperLogicPatterns) {
    if (pattern.test(content)) {
      failures.push(`${contract.js}: wrapper contains runtime/build logic matching ${pattern}; move logic to ${contract.ts}`);
    }
  }
}

function validateTsExportsMain(rootDir: string, contract: WrapperContract, failures: string[]): void {
  const tsContent = fs.readFileSync(path.join(rootDir, contract.ts), 'utf8');
  if (!/export\s+(async\s+)?function\s+main\b/.test(tsContent)) {
    failures.push(`${contract.ts}: expected exported main() for runTypeScriptScript wrapper`);
  }
}

function validateTsExportsDefault(rootDir: string, contract: WrapperContract, failures: string[]): void {
  const tsContent = fs.readFileSync(path.join(rootDir, contract.ts), 'utf8');
  if (!/export\s+default\s+(async\s+)?function\b/.test(tsContent)) {
    failures.push(`${contract.ts}: expected default export for loadTypeScriptScript wrapper`);
  }
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const contract of wrapperContracts) {
    const jsPath = path.join(rootDir, contract.js);
    const tsPath = path.join(rootDir, contract.ts);

    if (!fs.existsSync(jsPath)) {
      failures.push(`${contract.js}: missing compatibility wrapper`);
      continue;
    }
    if (!fs.existsSync(tsPath)) {
      failures.push(`${contract.ts}: missing TypeScript implementation for ${contract.js}`);
      continue;
    }

    const jsContent = fs.readFileSync(jsPath, 'utf8');
    if (contract.kind === 'run') {
      validateRunWrapper(rootDir, contract, jsContent, failures);
    } else {
      validateLoadDefaultWrapper(rootDir, contract, jsContent, failures);
    }
  }

  if (failures.length) {
    console.error('[typescript-wrapper-contract] FAILED:');
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }

  console.log('[ok] TypeScript wrapper contract check passed');
  return 0;
}

if (require.main === module && /check-typescript-wrapper-contract\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[typescript-wrapper-contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
