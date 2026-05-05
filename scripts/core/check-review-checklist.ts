#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from './action-registry';

const requiredFragments = [
  '# Review Checklist',
  '## Logging review checklist',
  'removes circular-object handling',
  'removes BigInt handling',
  'allows logging to throw from the main process',
  '## Changelog-backed regression review',
  'removes behavior documented in `CHANGELOG.md`',
];

export function main(): number {
  const rootDir = findProjectRoot();
  const review = fs.readFileSync(path.join(rootDir, 'REVIEW.md'), 'utf8');
  for (const fragment of requiredFragments) {
    if (!review.includes(fragment)) throw new Error(`REVIEW.md is missing required checklist content: ${fragment}`);
  }
  if (review.indexOf('# Review Checklist') > 0) throw new Error('REVIEW.md must start with the Review Checklist');
  console.log('[ok] Review checklist check passed');
  return 0;
}

if (require.main === module && /check-review-checklist\.js$/.test(process.argv[1] || '')) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
