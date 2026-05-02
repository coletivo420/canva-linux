'use strict';

const fs = require('fs');

const requiredFiles = [
  'docs/AI_GUARDRAILS.md',
  'docs/LOGGING_CONTRACT.md',
  'docs/FEATURES.md',
  'docs/DEBUGGING.md',
  'docs/AI_DEVELOPMENT.md',
  'REVIEW.md',
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[ai-guardrails] missing required file: ${file}`);
    failed = true;
  }
}

const forbiddenPublicDebugModes = [
  'CANVA_DEBUG=gpu',
  'CANVA_DEBUG=oauth',
  'CANVA_DEBUG=dnd',
  'CANVA_DEBUG=eyedropper',
  'CANVA_DEBUG=tabs',
  'CANVA_DEBUG=toolbar',
  'CANVA_DEBUG=permissions',
];

const publicDocs = [
  'README.md',
  'docs/DEBUGGING.md',
  'docs/GPU_ACCELERATION.md',
  'docs/LOGGING_CONTRACT.md',
];

for (const file of publicDocs) {
  if (!fs.existsSync(file)) continue;

  const text = fs.readFileSync(file, 'utf8');

  for (const mode of forbiddenPublicDebugModes) {
    if (text.includes(`${mode} flatpak run`)) {
      console.error(`[ai-guardrails] forbidden public debug command found in ${file}: ${mode}`);
      failed = true;
    }
  }
}

const loggingFiles = [
  'electron/main/logging.ts',
  'electron/main/logging-normalize.ts',
].filter((file) => fs.existsSync(file));

for (const file of loggingFiles) {
  const text = fs.readFileSync(file, 'utf8');

  if (file.includes('logging.') && text.includes('JSON.stringify(args)')) {
    console.error(`[ai-guardrails] unsafe JSON.stringify(args) found in ${file}`);
    failed = true;
  }
}

const loggingContract = fs.existsSync('docs/LOGGING_CONTRACT.md')
  ? fs.readFileSync('docs/LOGGING_CONTRACT.md', 'utf8')
  : '';

for (const required of [
  'normalizeLogArg',
  'normalizeArgs',
  'circular objects',
  'BigInt',
  'logs/current.log',
  'CANVA_DEBUG=1',
  'CANVA_DEBUG=2',
]) {
  if (!loggingContract.includes(required)) {
    console.error(`[ai-guardrails] LOGGING_CONTRACT missing: ${required}`);
    failed = true;
  }
}

const guardrails = fs.existsSync('docs/AI_GUARDRAILS.md')
  ? fs.readFileSync('docs/AI_GUARDRAILS.md', 'utf8')
  : '';

for (const required of [
  'Changelog-backed non-regression rule',
  'CHANGELOG.md is a source of protected project history',
  'must not remove, weaken, bypass, rename',
  'Dependency freshness guardrails',
  'must not downgrade direct runtime, build, lint or packaging dependencies',
  'adapt project code, config and build hooks',
]) {
  if (!guardrails.includes(required)) {
    console.error(`[ai-guardrails] AI_GUARDRAILS missing changelog-backed rule text: ${required}`);
    failed = true;
  }
}

const features = fs.existsSync('docs/FEATURES.md')
  ? fs.readFileSync('docs/FEATURES.md', 'utf8')
  : '';

for (const required of [
  'Changelog-backed features',
  'Features documented in `CHANGELOG.md` are considered established behavior',
]) {
  if (!features.includes(required)) {
    console.error(`[ai-guardrails] FEATURES missing changelog-backed protection: ${required}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('[ai-guardrails] OK');
