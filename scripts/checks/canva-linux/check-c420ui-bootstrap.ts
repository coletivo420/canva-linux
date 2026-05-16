import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import {
  C420UI_BOOTSTRAP_BUILD_RECIPE,
  C420UI_BOOTSTRAP_BUILD_TARGET,
  C420UI_BOOTSTRAP_BUILD_TOOL,
  C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS,
  C420UI_BOOTSTRAP_BUNDLE_FORMAT,
  createC420UIBootstrapEsbuildCliArgs,
  C420UI_BOOTSTRAP_FUTURE_MODULE_FORMAT,
  C420UI_BOOTSTRAP_MODULE_FORMAT,
} from "../../canva-linux/bootstrap/build-recipe";
import {
  calculateC420UIBootstrapSourceHash,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "../../canva-linux/bootstrap/source-hash";

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

function read(rootDir: string, relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function fileExistsAndIsNotEmpty(rootDir: string, relativePath: string, failures: string[]): void {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: required bootstrap artifact is missing`);
    return;
  }
  const stats = fs.statSync(absolutePath);
  if (!stats.isFile() || stats.size <= 0) {
    failures.push(`${relativePath}: required bootstrap artifact must be a non-empty file`);
  }
}

function indexOfRequired(content: string, fragment: string, failures: string[], label: string): number {
  const index = content.indexOf(fragment);
  if (index === -1) failures.push(`${label}: missing required fragment ${fragment}`);
  return index;
}

function summarizeCommandFailure(result: ReturnType<typeof spawnSync>): string {
  const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`.trim();
  if (result.error) return result.error.message;
  return output.split("\n").find((line) => line.trim().length > 0)?.trim() || `exit status ${result.status}`;
}

function validateJavaScriptSyntax(rootDir: string, relativePath: string, failures: string[]): void {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) return;

  const result = spawnSync(process.execPath, ["--check", absolutePath], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    failures.push(`${relativePath}: generated bootstrap artifact is not valid JavaScript (${summarizeCommandFailure(result)})`);
  }
}

function countOccurrences(content: string, fragment: string): number {
  let count = 0;
  let index = content.indexOf(fragment);

  while (index !== -1) {
    count += 1;
    index = content.indexOf(fragment, index + fragment.length);
  }

  return count;
}

function validateBundledBlessedNodeSection(relativePath: string, bundle: string, failures: string[]): void {
  if (!bundle.includes("Node.prototype.remove = function(element)")) return;

  const requiredSingleDefinitions = [
    "Node.prototype.emitAncestors = function()",
    "Node.prototype.hasAncestor = function(target)",
  ];

  for (const definition of requiredSingleDefinitions) {
    const count = countOccurrences(bundle, definition);
    if (count !== 1) {
      failures.push(`${relativePath}: expected exactly one bundled blessed ${definition} definition, found ${count}`);
    }
  }

  const orderedFragments = [
    "Node.prototype.remove = function(element)",
    "if (this.screen.focused === element)",
    "Node.prototype.detach = function()",
    "Node.prototype.forAncestors = function(iter, s)",
    "Node.prototype.emitAncestors = function()",
    "Node.prototype.hasAncestor = function(target)",
    "return false;",
    "Node.prototype.get = function(name, value)",
  ];

  let previousIndex = -1;
  for (const fragment of orderedFragments) {
    const index = bundle.indexOf(fragment, previousIndex + 1);
    if (index === -1) {
      failures.push(`${relativePath}: missing bundled blessed node fragment ${fragment}`);
      continue;
    }
    if (index <= previousIndex) {
      failures.push(`${relativePath}: bundled blessed node fragment is out of order: ${fragment}`);
    }
    previousIndex = index;
  }

  const hasAncestorStart = bundle.indexOf("Node.prototype.hasAncestor = function(target)");
  const getStart = bundle.indexOf("Node.prototype.get = function(name, value)", hasAncestorStart);
  if (hasAncestorStart !== -1 && getStart !== -1) {
    const hasAncestorSection = bundle.slice(hasAncestorStart, getStart);
    if (!hasAncestorSection.includes("return false;") || !hasAncestorSection.includes("};")) {
      failures.push(`${relativePath}: bundled blessed Node.prototype.hasAncestor must close before Node.prototype.get`);
    }
    if (hasAncestorSection.includes("Node.prototype.emitAncestors")) {
      failures.push(`${relativePath}: bundled blessed Node.prototype.hasAncestor contains duplicated emitAncestors fragments`);
    }
  }
}

function validateBundledActionEngineSection(relativePath: string, bundle: string, failures: string[]): void {
  const actionEngineStart = bundle.indexOf("function createC420UIActionEngine(options)");
  if (actionEngineStart === -1) return;

  const actionEngineEnd = bundle.indexOf("\n// packages/c420ui/src/", actionEngineStart + 1);
  if (actionEngineEnd === -1) {
    failures.push(`${relativePath}: bundled c420ui action engine section is missing the next c420ui module boundary`);
    return;
  }

  const actionEngineSection = bundle.slice(actionEngineStart, actionEngineEnd);
  const orderedFragments = [
    "function listActions()",
    "function resolveActionById(actionId)",
    "function resolveActionByCliFlag(flag)",
    "async function runActionById(actionId, runOptions = {})",
    "async function runAction(action, runOptions = {})",
    "return {",
    "listActions,",
    "resolveActionById,",
    "resolveActionByCliFlag,",
    "runActionById,",
    "runAction",
    "};",
  ];

  let previousIndex = -1;
  for (const fragment of orderedFragments) {
    const index = actionEngineSection.indexOf(fragment, previousIndex + 1);
    if (index === -1) {
      failures.push(`${relativePath}: missing bundled c420ui action engine fragment ${fragment}`);
      continue;
    }
    if (index <= previousIndex) {
      failures.push(`${relativePath}: bundled c420ui action engine fragment is out of order: ${fragment}`);
    }
    previousIndex = index;
  }

  const engineReturnStart = actionEngineSection.lastIndexOf("return {");
  const engineReturnEnd = engineReturnStart === -1 ? -1 : actionEngineSection.indexOf("};", engineReturnStart);
  if (engineReturnStart === -1 || engineReturnEnd === -1) {
    failures.push(`${relativePath}: bundled c420ui action engine must return its API object before init_action_engine`);
    return;
  }

  const engineReturnSection = actionEngineSection.slice(engineReturnStart, engineReturnEnd);
  for (const fragment of ["listActions,", "resolveActionById,", "resolveActionByCliFlag,", "runActionById,", "runAction"]) {
    if (!engineReturnSection.includes(fragment)) {
      failures.push(`${relativePath}: bundled c420ui action engine API return is missing ${fragment}`);
    }
  }
}

function validateBundledCanvaLinuxAdapterSection(relativePath: string, bundle: string, failures: string[]): void {
  const adapterStart = bundle.indexOf("function createCanvaLinuxC420UIAdapter(rootDir");
  if (adapterStart === -1) return;

  const adapterEnd = bundle.indexOf("\n// scripts/c420ui-adapter/", adapterStart + 1);
  if (adapterEnd === -1) {
    failures.push(`${relativePath}: bundled Canva Linux adapter section is missing the next c420ui-adapter module boundary`);
    return;
  }

  const adapterSection = bundle.slice(adapterStart, adapterEnd);
  const orderedFragments = [
    "function overviewStatus()",
    "return buildCanvaLinuxOverviewStatus(resolvedRootDir);",
    "async function runAction(actionId, context)",
    "return runC420UICommand({",
    "args: action.args ?? []",
    "const adapter = {",
    "runAction,",
    "overviewStatus,",
    "return createC420UIBridge(adapter);",
  ];

  let previousIndex = -1;
  for (const fragment of orderedFragments) {
    const index = adapterSection.indexOf(fragment, previousIndex + 1);
    if (index === -1) {
      failures.push(`${relativePath}: missing bundled Canva Linux adapter fragment ${fragment}`);
      continue;
    }
    if (index <= previousIndex) {
      failures.push(`${relativePath}: bundled Canva Linux adapter fragment is out of order: ${fragment}`);
    }
    previousIndex = index;
  }

  const overviewStart = adapterSection.indexOf("function overviewStatus()");
  const runActionStart = adapterSection.indexOf("async function runAction(actionId, context)", overviewStart);
  if (overviewStart !== -1 && runActionStart !== -1) {
    const overviewSection = adapterSection.slice(overviewStart, runActionStart);
    if (overviewSection.includes("args: action.args") || overviewSection.includes("emitProgress")) {
      failures.push(`${relativePath}: bundled overviewStatus contains runAction fragments`);
    }
    if (!overviewSection.includes("return buildCanvaLinuxOverviewStatus(resolvedRootDir);")) {
      failures.push(`${relativePath}: bundled overviewStatus must return buildCanvaLinuxOverviewStatus(resolvedRootDir)`);
    }
  }

  if (countOccurrences(adapterSection, "function overviewStatus()") !== 1) {
    failures.push(`${relativePath}: expected exactly one bundled Canva Linux overviewStatus function`);
  }
  if (countOccurrences(adapterSection, "return createC420UIBridge(adapter);") !== 1) {
    failures.push(`${relativePath}: bundled Canva Linux adapter must return createC420UIBridge(adapter) exactly once`);
  }
}

function validateBlessedRuntimeAssetsMatchPackage(
  rootDir: string,
  relativePaths: readonly string[],
  failures: string[],
): void {
  const requireFromRoot = createRequire(path.join(rootDir, "package.json"));
  const blessedUsrDir = path.join(
    path.dirname(requireFromRoot.resolve("blessed/package.json")),
    "usr",
  );
  const bootstrapUsrDir = path.join(rootDir, "bootstrap", "usr");

  for (const relativePath of relativePaths) {
    const committedPath = path.join(rootDir, relativePath);
    const relativeAsset = path.relative(bootstrapUsrDir, committedPath);
    const packagePath = path.join(blessedUsrDir, relativeAsset);

    if (!fs.existsSync(committedPath) || !fs.existsSync(packagePath)) continue;

    const committed = fs.readFileSync(committedPath);
    const packaged = fs.readFileSync(packagePath);
    if (!committed.equals(packaged)) {
      failures.push(`${relativePath}: runtime asset is stale; run npm run build:c420ui-bootstrap`);
    }
  }
}

function validateGeneratedArtifactsMatchBuildRecipe(
  rootDir: string,
  relativePaths: readonly string[],
  failures: string[],
): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-bootstrap-check-"));

  try {
    const result = spawnSync(
      "npx",
      ["esbuild", ...createC420UIBootstrapEsbuildCliArgs(tempDir)],
      {
        cwd: rootDir,
        encoding: "utf8",
        shell: false,
      },
    );

    if (result.error || result.status !== 0) {
      failures.push(`bootstrap/c420ui: unable to regenerate bootstrap artifacts for comparison (${summarizeCommandFailure(result)})`);
      return;
    }

    for (const relativePath of relativePaths) {
      const generatedPath = path.join(tempDir, path.basename(relativePath));
      const committedPath = path.join(rootDir, relativePath);
      if (!fs.existsSync(generatedPath) || !fs.existsSync(committedPath)) continue;

      const generated = fs.readFileSync(generatedPath);
      const committed = fs.readFileSync(committedPath);
      if (!generated.equals(committed)) {
        failures.push(`${relativePath}: generated bootstrap artifact is stale; run npm run build:c420ui-bootstrap`);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main(): void {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const manifestPath = "bootstrap/c420ui/manifest.json";
  const uiBundlePath = "bootstrap/c420ui/run-c420ui.cjs";
  const cliBundlePath = "bootstrap/c420ui/run-c420ui-cli.cjs";
  const builderBundlePath = "bootstrap/c420ui/c420ui-builder.cjs";
  const blessedRuntimeAssets = C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS.map(
    (asset) => `bootstrap/usr/${asset}`,
  );

  for (const relativePath of [manifestPath, uiBundlePath, cliBundlePath, builderBundlePath, ...blessedRuntimeAssets]) {
    fileExistsAndIsNotEmpty(rootDir, relativePath, failures);
  }

  for (const forbiddenPath of [
    "bootstrap/c420ui/canva-linux-c420ui-builder.cjs",
    "scripts/canva-linux-c420ui-builder.ts",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
      failures.push(`${forbiddenPath}: old Canva Linux-specific internal builder artifact must not exist`);
    }
  }

  if (fs.existsSync(path.join(rootDir, manifestPath))) {
    const manifest = JSON.parse(read(rootDir, manifestPath)) as Record<string, unknown>;
    const rootPackageJson = JSON.parse(read(rootDir, "package.json")) as { version?: string };
    const c420uiPackageJson = JSON.parse(read(rootDir, "packages/c420ui/package.json")) as { version?: string };

    if ("version" in manifest) {
      failures.push(`${manifestPath}: use c420uiVersion and dependentProjectVersion instead of ambiguous version`);
    }
    if (c420uiPackageJson.version === rootPackageJson.version) {
      failures.push("packages/c420ui/package.json: c420ui version must stay distinct from the dependent project version");
    }

    const expected: Record<string, unknown> = {
      kind: "c420ui-bootstrap",
      c420uiVersion: c420uiPackageJson.version,
      dependentProject: "canva-linux",
      dependentProjectVersion: rootPackageJson.version,
      entrypoint: "run-c420ui.cjs",
      cliEntrypoint: "run-c420ui-cli.cjs",
      requiresNode: ">=22.0.0",
      buildRecipe: C420UI_BOOTSTRAP_BUILD_RECIPE,
      buildTool: C420UI_BOOTSTRAP_BUILD_TOOL,
      buildTarget: C420UI_BOOTSTRAP_BUILD_TARGET,
      bundleFormat: C420UI_BOOTSTRAP_BUNDLE_FORMAT,
      moduleFormat: C420UI_BOOTSTRAP_MODULE_FORMAT,
      futureModuleFormat: C420UI_BOOTSTRAP_FUTURE_MODULE_FORMAT,
      typescriptFirst: true,
      ownsFullDependencyPolicy: true,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (manifest[key] !== value) {
        failures.push(`${manifestPath}: expected ${key} to be ${JSON.stringify(value)}`);
      }
    }

    const entrypoints = manifest.entrypoints as Record<string, unknown> | undefined;
    if (entrypoints?.ui !== "bootstrap/c420ui/run-c420ui.cjs") {
      failures.push(`${manifestPath}: expected entrypoints.ui to be bootstrap/c420ui/run-c420ui.cjs`);
    }
    if (entrypoints?.cli !== "bootstrap/c420ui/run-c420ui-cli.cjs") {
      failures.push(`${manifestPath}: expected entrypoints.cli to be bootstrap/c420ui/run-c420ui-cli.cjs`);
    }
    if (entrypoints?.builder !== "bootstrap/c420ui/c420ui-builder.cjs") {
      failures.push(`${manifestPath}: expected entrypoints.builder to be bootstrap/c420ui/c420ui-builder.cjs`);
    }

    if (manifest.sourceHashAlgorithm !== C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM) {
      failures.push(`${manifestPath}: expected sourceHashAlgorithm to be ${C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM}`);
    }

    if (typeof manifest.sourceHash !== "string" || !manifest.sourceHash.startsWith("sha256:")) {
      failures.push(`${manifestPath}: expected sourceHash to start with sha256:`);
    }

    if (!Array.isArray(manifest.sourceHashInputs)) {
      failures.push(`${manifestPath}: expected sourceHashInputs to be an array`);
    } else {
      for (const requiredInput of C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS) {
        if (!manifest.sourceHashInputs.includes(requiredInput)) {
          failures.push(`${manifestPath}: sourceHashInputs must include ${requiredInput}`);
        }
      }
      if (!manifest.sourceHashInputs.includes("scripts/build-c420ui-bootstrap.ts")) {
        failures.push(`${manifestPath}: sourceHashInputs must explicitly include scripts/build-c420ui-bootstrap.ts`);
      }
      for (const forbiddenInput of ["scripts/canva-linux-c420ui-builder.ts", "bootstrap/c420ui/canva-linux-c420ui-builder.cjs"] as const) {
        if (manifest.sourceHashInputs.includes(forbiddenInput)) {
          failures.push(`${manifestPath}: sourceHashInputs must not include ${forbiddenInput}`);
        }
      }
    }

    try {
      const currentSourceHash = calculateC420UIBootstrapSourceHash(rootDir);
      if (manifest.sourceHash !== currentSourceHash) {
        failures.push(`${manifestPath}: sourceHash is stale; run npm run build:c420ui-bootstrap`);
      }
    } catch (error) {
      failures.push(`${manifestPath}: unable to calculate sourceHash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const interactiveEntrypoint = read(rootDir, "scripts/run-c420ui.ts");
  for (const forbidden of ["ensureCanvaLinuxHostDependencies", "isC420UIHostDependencyFailure"]) {
    if (interactiveEntrypoint.includes(forbidden)) {
      failures.push(`scripts/run-c420ui.ts: must not resolve dependent project dependencies before starting c420ui (${forbidden})`);
    }
  }

  const adapterRun = read(rootDir, "scripts/c420ui-adapter/run.ts");
  for (const fragment of ["startupTasks", "Checking dependent project dependencies", "ensureCanvaLinuxHostDependencies"]) {
    if (!adapterRun.includes(fragment)) {
      failures.push(`scripts/c420ui-adapter/run.ts: missing startup dependency task fragment ${fragment}`);
    }
  }

  const launcher = read(rootDir, "canva-linux-c420ui-builder");
  const bootstrapBuilderIndex = indexOfRequired(launcher, "bootstrap/c420ui/c420ui-builder.cjs", failures, "canva-linux-c420ui-builder");
  const buildBuilderIndex = indexOfRequired(launcher, ".build/scripts/c420ui-builder.js", failures, "canva-linux-c420ui-builder");

  if (bootstrapBuilderIndex !== -1 && buildBuilderIndex !== -1 && bootstrapBuilderIndex > buildBuilderIndex) {
    failures.push("canva-linux-c420ui-builder: launcher must check bootstrap/c420ui/c420ui-builder.cjs before .build fallback");
  }

  for (const forbidden of [
    "npm install",
    "npm ci",
    "scripts/ensure-npm-dependencies.sh",
    "CANVA_REQUIRED_NPM_DEPS",
    "CANVA_SKIP_NPM_INSTALL",
    "CANVA_NPM_REPAIR",
  ]) {
    if (launcher.includes(forbidden)) failures.push(`canva-linux-c420ui-builder: must not contain ${forbidden}`);
  }

  for (const relativePath of [uiBundlePath, cliBundlePath, builderBundlePath]) {
    validateJavaScriptSyntax(rootDir, relativePath, failures);
  }
  validateGeneratedArtifactsMatchBuildRecipe(rootDir, [uiBundlePath, cliBundlePath, builderBundlePath], failures);
  validateBlessedRuntimeAssetsMatchPackage(rootDir, blessedRuntimeAssets, failures);

  for (const relativePath of [uiBundlePath, cliBundlePath]) {
    if (!fs.existsSync(path.join(rootDir, relativePath))) continue;
    const bundle = read(rootDir, relativePath);
    validateBundledBlessedNodeSection(relativePath, bundle, failures);
    validateBundledActionEngineSection(relativePath, bundle, failures);
    validateBundledCanvaLinuxAdapterSection(relativePath, bundle, failures);

    for (const forbidden of ["electron-builder", "@typescript-eslint", "playwright", "typescript/lib"]) {
      if (bundle.includes(forbidden)) failures.push(`${relativePath}: must not contain ${forbidden}`);
    }
  }

  if (fs.existsSync(path.join(rootDir, builderBundlePath))) {
    const bundle = read(rootDir, builderBundlePath);
    for (const forbidden of ["electron-builder", "@typescript-eslint", "playwright", "typescript/lib"]) {
      if (bundle.includes(forbidden)) failures.push(`${builderBundlePath}: must not contain ${forbidden}`);
    }
  }

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

main();
