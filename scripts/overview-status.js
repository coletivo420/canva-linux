#!/usr/bin/env node
const { loadCore, fallbackOverviewStatus } = require('./core-wrapper');

const core = loadCore('overview-status');
if (!core) {
  console.log(JSON.stringify(fallbackOverviewStatus()));
  process.exit(0);
}

try {
  process.exit(core.main());
} catch (error) {
  process.stderr.write(`[warn] Failed to build overview status: ${error instanceof Error ? error.message : String(error)}\n`);
  console.log(JSON.stringify(fallbackOverviewStatus()));
  process.exit(0);
}
