#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const activeFiles = [
  'canva-linux.sh',
  'scripts/tui/app.ts',
  'scripts/tui/index.ts',
  'README.md',
  'docs/CLI.md',
  'docs/TECHNICAL.md',
];

const forbiddenPatterns = [
  'run_interactive_mode',
  'print_main_screen',
  'menu_install',
  'menu_dev',
  'menu_maint',
  'Shell Tool',
  'SWITCH_TO_SHELL_EXIT_CODE',
  'TUI_SWITCH_TO_SHELL_EXIT_CODE',
  'shell fallback menu',
  'shell menu fallback',
];

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const file of activeFiles) {
    const fullPath = path.join(rootDir, file);
    if (!fs.existsSync(fullPath)) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (text.includes(pattern)) failures.push(`${file}: forbidden shell-menu fragment: ${pattern}`);
    }
  }

  if (failures.length) throw new Error(failures.join('\n'));
  console.log('[ok] No shell menu check passed');
  return 0;
}

if (require.main === module && /check-no-shell-menu\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
