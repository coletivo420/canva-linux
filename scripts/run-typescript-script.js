'use strict';
// @ts-nocheck

const path = require('node:path');
const { createRequire } = require('node:module');
const requireFromHere = createRequire(__filename);
const esbuildPackageName = 'esbuild';
const esbuild = requireFromHere(esbuildPackageName);

const repoRoot = path.resolve(__dirname, '..');

function scriptNameFromWrapper(wrapperFilename) {
  return path.basename(wrapperFilename, '.js');
}

function buildScript(wrapperFilename) {
  const scriptName = scriptNameFromWrapper(wrapperFilename);
  const sourceDir = path.dirname(wrapperFilename);
  const entryPoint = path.join(sourceDir, `${scriptName}.ts`);
  const relativePath = path.relative(repoRoot, wrapperFilename);
  const flatName = relativePath.replace(/[\\/]/g, '-').replace(/\.js$/, '');
  const outfile = path.join(repoRoot, '.build', 'scripts', 'bootstrap', `${flatName}.js`);

  esbuild.buildSync({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    external: ['electron', 'blessed', 'esbuild'],
    sourcemap: false,
    minify: false,
    legalComments: 'none',
    logLevel: 'silent',
  });

  return outfile;
}

function loadTypeScriptScript(wrapperFilename) {
  process.env.CANVA_SCRIPT_REPO_ROOT = repoRoot;
  process.env.CANVA_SCRIPT_SOURCE_DIR = path.dirname(wrapperFilename);
  return require(buildScript(wrapperFilename));
}

function runTypeScriptScript(wrapperFilename) {
  const mod = loadTypeScriptScript(wrapperFilename);
  const main = typeof mod.main === 'function' ? mod.main : mod.default;
  if (typeof main !== 'function') {
    throw new TypeError(`Compiled script does not export main(): ${wrapperFilename}`);
  }
  const result = main();
  if (result && typeof result.then === 'function') {
    result.catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
  }
  return result;
}

module.exports = { loadTypeScriptScript, runTypeScriptScript };
