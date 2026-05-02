'use strict';

// Canva Linux ships compiled app files and has no production npm dependencies.
// Returning false tells electron-builder to skip native dependency rebuilds and
// its npm module collector, which is unnecessary for this package layout.
exports.default = async function beforeBuild() {
  return false;
};
