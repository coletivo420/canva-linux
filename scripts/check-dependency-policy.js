#!/usr/bin/env node
const { loadCore } = require('./core-wrapper');

const core = loadCore('check-dependency-policy');
if (!core) process.exit(1);

try {
  process.exit(core.main());
} catch (error) {
  console.error(`[dependency-policy] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
