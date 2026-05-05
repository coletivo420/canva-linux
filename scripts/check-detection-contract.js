#!/usr/bin/env node
const { loadCore } = require('./core-wrapper');

const core = loadCore('check-detection-contract');
if (!core) process.exit(1);

try {
  process.exit(core.main());
} catch (error) {
  console.error(`[error] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
