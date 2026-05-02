'use strict';

const fs = require('fs');

const requiredFiles = [
  'docs/AI_GUARDRAILS.md',
  'docs/VALIDATION.md',
  'docs/TYPESCRIPT.md',
  'docs/CANVA_LINUX_EYEDROPPER.md',
  'README.md',
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[ai-guardrails] missing required file: ${file}`);
    failed = true;
  }
}

const readme = fs.existsSync('README.md') ? fs.readFileSync('README.md', 'utf8') : '';
for (const requiredRef of [
  'docs/README.md',
  'docs/VALIDATION.md',
  'docs/DEVELOPMENT.md',
  'docs/TYPESCRIPT.md',
  'docs/CANVA_LINUX_EYEDROPPER.md',
  'docs/AI_GUARDRAILS.md',
]) {
  if (!readme.includes(requiredRef)) {
    console.error(`[ai-guardrails] README missing documentation reference: ${requiredRef}`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log('[ai-guardrails] OK');
