#!/usr/bin/env node
const { loadCore } = require('./core-wrapper');

const core = loadCore('action-runner');
if (!core) process.exit(1);

process.exit(core.main(process.argv.slice(2)));
