'use strict';

exports.default = async function beforeBuild(context) {
  const mod = require('./run-typescript-script').loadTypeScriptScript(__filename);
  return mod.default(context);
};
