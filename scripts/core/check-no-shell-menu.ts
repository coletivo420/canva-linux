#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

type FileKind = 'shell' | 'typescript';

const activeFiles: Array<{ path: string; kind: FileKind }> = [
  { path: 'canva-linux.sh', kind: 'shell' },
  { path: 'scripts/tui/app.ts', kind: 'typescript' },
  { path: 'scripts/tui/index.ts', kind: 'typescript' },
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
  '--tui',
  '--no-tui',
  'CANVA_NO_TUI',
  'CANVA_TUI',
  'F4 Shell Tool',
  'fallback para shell',
  'shell menu interativo',
  'opção “Use TUI Tool”',
];

function stripShellComment(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#')) return '';
  return line;
}

function stripTypeScriptComments(line: string, state: { inBlockComment: boolean }): string {
  let remaining = line;
  let result = '';

  while (remaining.length) {
    if (state.inBlockComment) {
      const endIndex = remaining.indexOf('*/');
      if (endIndex === -1) return result;
      remaining = remaining.slice(endIndex + 2);
      state.inBlockComment = false;
      continue;
    }

    const lineCommentIndex = remaining.indexOf('//');
    const blockCommentIndex = remaining.indexOf('/*');
    if (lineCommentIndex !== -1 && (blockCommentIndex === -1 || lineCommentIndex < blockCommentIndex)) {
      result += remaining.slice(0, lineCommentIndex);
      return result;
    }
    if (blockCommentIndex !== -1) {
      result += remaining.slice(0, blockCommentIndex);
      remaining = remaining.slice(blockCommentIndex + 2);
      state.inBlockComment = true;
      continue;
    }

    result += remaining;
    return result;
  }

  return result;
}

function activeLine(line: string, kind: FileKind, state: { inBlockComment: boolean }): string {
  if (kind === 'shell') return stripShellComment(line);
  return stripTypeScriptComments(line, state);
}

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const file of activeFiles) {
    const fullPath = path.join(rootDir, file.path);
    if (!fs.existsSync(fullPath)) continue;
    const state = { inBlockComment: false };
    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      const checkedLine = activeLine(line, file.kind, state);
      for (const pattern of forbiddenPatterns) {
        if (checkedLine.includes(pattern)) {
          // Special case: CANVA_TUI is a substring of CANVA_TUI_ROOT_AUTH and CANVA_TUI_TITLE (which are allowed)
          if (pattern === 'CANVA_TUI' && (checkedLine.includes('CANVA_TUI_ROOT_AUTH') || checkedLine.includes('CANVA_TUI_TITLE'))) {
            const sanitized = checkedLine.replace(/CANVA_TUI_ROOT_AUTH/g, '').replace(/CANVA_TUI_TITLE/g, '');
            if (!sanitized.includes('CANVA_TUI')) continue;
          }
          failures.push(`${file.path}:${index + 1}: forbidden shell-menu fragment: ${pattern}`);
        }
      }
    });
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
