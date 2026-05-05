const { loadCore } = require('./core-wrapper');

const core = loadCore('action-registry');
if (!core) process.exit(1);

module.exports = core;
