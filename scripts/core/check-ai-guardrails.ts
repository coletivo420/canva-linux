#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const requiredFiles = [
  'docs/AI_GUARDRAILS.md',
  'docs/VALIDATION.md',
  'docs/TYPESCRIPT.md',
  'docs/CANVA_LINUX_EYEDROPPER.md',
  'README.md',
];

const readmeRefs = [
  'docs/README.md',
  'docs/VALIDATION.md',
  'docs/DEVELOPMENT.md',
  'docs/TYPESCRIPT.md',
  'docs/CANVA_LINUX_EYEDROPPER.md',
  'docs/AI_GUARDRAILS.md',
];

const requiredGuardrails = [
  'The interactive shell menu has been removed.',
  'The project exposes only TUI and direct CLI actions.',
  'F4 Shell Tool must not return to the TUI footer or keybindings.',
  '`--no-tui` must not open an interactive shell menu.',
  'System-wide actions must use scripts/sudo-common.sh.',
  'Raw sudo calls are forbidden outside scripts/sudo-common.sh.',
  'User-scope actions must never call sudo.',
  'overview-status must always emit valid JSON.',
  'TUI and CLI must share the same TypeScript action contract.',
  'REVIEW.md must preserve the Review Checklist.',
];

export function main(): number {
  const rootDir = findProjectRoot();
  const failures: string[] = [];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(rootDir, file))) failures.push(`missing required file: ${file}`);
  }

  const readme = fs.existsSync(path.join(rootDir, 'README.md')) ? fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8') : '';
  for (const ref of readmeRefs) {
    if (!readme.includes(ref)) failures.push(`README missing documentation reference: ${ref}`);
  }
  if (readme.includes('Shell Tool')) failures.push('README must not mention Shell Tool');

  const guardrails = fs.existsSync(path.join(rootDir, 'docs/AI_GUARDRAILS.md')) ? fs.readFileSync(path.join(rootDir, 'docs/AI_GUARDRAILS.md'), 'utf8') : '';
  for (const fragment of requiredGuardrails) {
    if (!guardrails.includes(fragment)) failures.push(`AI_GUARDRAILS missing rule: ${fragment}`);
  }

  const review = fs.existsSync(path.join(rootDir, 'REVIEW.md')) ? fs.readFileSync(path.join(rootDir, 'REVIEW.md'), 'utf8') : '';
  if (!review.startsWith('# Review Checklist')) failures.push('REVIEW.md must preserve the Review Checklist at the top');

  if (failures.length) throw new Error(failures.join('\n'));
  console.log('[ai-guardrails] OK');
  return 0;
}

if (require.main === module && /check-ai-guardrails\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[ai-guardrails] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
