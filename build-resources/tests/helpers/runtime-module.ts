// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
export const runtimeRequire = require;

const repoRoot =
  process.env.CANVA_TEST_REPO_ROOT || path.resolve(__dirname, "..", "..");
let typeScriptExtensionRegistered = false;

/**
 * @param {string} file
 * @param {NodeJS.Module} mod
 * @returns {void}
 */
function compileTypeScriptModule(file, mod) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      sourceMap: false,
    },
    fileName: file,
  }).outputText.replace(
    /require\("((?:\.{1,2}\/)[^"]+)\.js"\)/g,
    (_match, importPath: string) => {
      const candidate = path.resolve(path.dirname(file), `${importPath}.ts`);
      return fs.existsSync(candidate)
        ? `require("${importPath}.ts")`
        : `require("${importPath}.js")`;
    },
  );

  /** @type {any} */ mod._compile(output, file);
}

function registerTypeScriptExtension() {
  if (typeScriptExtensionRegistered) {
    return;
  }

  typeScriptExtensionRegistered = true;
  /** @type {Record<string, (mod: NodeJS.Module, filename: string) => void>} */ require.extensions[
    ".ts"
  ] = (mod, file) => {
    compileTypeScriptModule(file, mod);
  };
}

/**
 * @param {string} modulePath
 * @returns {any}
 */
export function loadRuntimeModule(modulePath) {
  const sourceTs = path.join(repoRoot, "build-resources", "electron", `${modulePath}.ts`);

  registerTypeScriptExtension();

  if (fs.existsSync(sourceTs)) {
    return require(sourceTs);
  }

  throw new Error(`Runtime module not found: ${modulePath}`);
}
