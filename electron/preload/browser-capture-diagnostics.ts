// @ts-nocheck -- These preload modules intentionally use CommonJS/Electron globals until their runtime contracts are fully typed.

// Keep the historical module filename for preload packaging stability. The
// implementation now represents eyedropper routing diagnostics only.
module.exports = require("./eyedropper-routing-diagnostics");
