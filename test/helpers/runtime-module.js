'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..', '..');
let typeScriptExtensionRegistered = false;

/**
 * @param {string} file
 * @param {NodeJS.Module} mod
 * @returns {void}
 */
function compileTypeScriptModule(file, mod) {
  const source = fs.readFileSync(file, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      sourceMap: false,
    },
    fileName: file,
  }).outputText;

  /** @type {any} */ (mod)._compile(output, file);
}

function registerTypeScriptExtension() {
  if (typeScriptExtensionRegistered) {
    return;
  }

  typeScriptExtensionRegistered = true;
  /** @type {Record<string, (mod: NodeJS.Module, filename: string) => void>} */ (require.extensions)['.ts'] = (mod, file) => {
    compileTypeScriptModule(file, mod);
  };
}

/**
 * @param {string} modulePath
 * @returns {any}
 */
function loadRuntimeModule(modulePath) {
  const sourceJs = path.join(repoRoot, 'electron', `${modulePath}.js`);
  const sourceTs = path.join(repoRoot, 'electron', `${modulePath}.ts`);

  registerTypeScriptExtension();

  if (fs.existsSync(sourceJs)) {
    return require(sourceJs);
  }

  if (fs.existsSync(sourceTs)) {
    return require(sourceTs);
  }

  throw new Error(`Runtime module not found: ${modulePath}`);
}

module.exports = {
  loadRuntimeModule,
};
