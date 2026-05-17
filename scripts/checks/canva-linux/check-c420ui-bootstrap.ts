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
import { loadEffectiveBuildMetadata } from "../../canva-linux/build-metadata-loader";

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

const C420UI_RUNTIME_CORRUPTION_MESSAGE =
  "bootstrap/c420ui/run-c420ui.cjs appears structurally corrupted. Regenerate c420ui bootstrap from TypeScript sources.";

function validateC420UIRuntimeBundleKnownCorruption(content: string, failures: string[]): void {
  const malformedSigcontClosure = /process\.once\("SIGCONT", function\(\) \{[\s\S]{0,600}?\n\s*};\s*\n\s*process\.kill\(process\.pid, "SIGTSTP"\)/.test(content);
  const interactiveRunnerStart = content.indexOf("function createInteractiveActionRunner(options) {");
  const hostDependenciesStart = content.indexOf("\n// packages/c420ui/src/host-dependencies.ts", interactiveRunnerStart);
  const interactiveRunnerPrefix = interactiveRunnerStart === -1 || hostDependenciesStart === -1
    ? ""
    : content.slice(interactiveRunnerStart, hostDependenciesStart);
  const assertOptionalInjectedInInteractiveRunner = /function assertOptional(?:Boolean|String|StringArray)\b/.test(interactiveRunnerPrefix);

  if (malformedSigcontClosure || assertOptionalInjectedInInteractiveRunner) {
    failures.push(C420UI_RUNTIME_CORRUPTION_MESSAGE);
  }
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
    failures.push(`${relativePath}: c420ui bootstrap bundles must be regenerated from TypeScript sources and pass node --check (${summarizeCommandFailure(result)})`);
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

type BootstrapManifestBuildMetadata = {
  dependentProjectBuildRevision?: unknown;
  dependentProjectFullVersion?: unknown;
  dependentProjectDisplayVersion?: unknown;
  dependentProjectPhase?: unknown;
};

type BuildMetadataJson = {
  buildRevision?: string;
  fullVersion?: string;
  displayVersion?: string;
  phase?: string;
};

function readJson<T>(rootDir: string, relativePath: string): T | null {
  try {
    return JSON.parse(read(rootDir, relativePath)) as T;
  } catch {
    return null;
  }
}

function hasRevisionOverride(): boolean {
  return [
    "CANVA_LINUX_BUILD_REVISION",
    "GITHUB_SHA",
    "CI_COMMIT_SHA",
    "SOURCE_COMMIT",
  ].some((key) => Boolean(process.env[key]?.trim()));
}

function validateManifestBuildMetadata(
  rootDir: string,
  manifest: BootstrapManifestBuildMetadata,
  failures: string[],
): void {
  const metadataPath = "config/canva-linux/build-metadata.json";
  const packagedMetadata = readJson<BuildMetadataJson>(rootDir, metadataPath);
  if (!packagedMetadata) {
    failures.push(`${metadataPath}: missing generated build metadata for c420ui bootstrap consistency checks`);
    return;
  }

  for (const [manifestField, metadataField] of [
    ["dependentProjectBuildRevision", "buildRevision"],
    ["dependentProjectFullVersion", "fullVersion"],
    ["dependentProjectDisplayVersion", "displayVersion"],
    ["dependentProjectPhase", "phase"],
  ] as const) {
    if (manifest[manifestField] !== packagedMetadata[metadataField]) {
      failures.push(`bootstrap/c420ui/manifest.json: ${manifestField} must match ${metadataPath} ${metadataField}; run npm run build:c420ui-bootstrap`);
    }
  }

  // Exact effective metadata checks are deterministic in packaged mode and in
  // CI/env override mode. A local source checkout without an override can move
  // HEAD after generated files are committed, so the stale-HEAD case remains
  // covered by build:c420ui-bootstrap using loadEffectiveBuildMetadata and by
  // the generated-metadata comparison above.
  if (!fs.existsSync(path.join(rootDir, ".git")) || hasRevisionOverride()) {
    const effectiveMetadata = loadEffectiveBuildMetadata(rootDir);
    if (manifest.dependentProjectBuildRevision !== effectiveMetadata.buildRevision) {
      failures.push("bootstrap/c420ui/manifest.json: dependentProjectBuildRevision must match loadEffectiveBuildMetadata(rootDir).buildRevision");
    }
    if (manifest.dependentProjectFullVersion !== effectiveMetadata.fullVersion) {
      failures.push("bootstrap/c420ui/manifest.json: dependentProjectFullVersion must match loadEffectiveBuildMetadata(rootDir).fullVersion");
    }
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
    "bootstrap/c420ui/" + "canva-linux-c420ui-builder.cjs",
    "scripts/" + "canva-linux-c420ui-builder.ts",
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
      for (const forbiddenInput of ["scripts/" + "canva-linux-c420ui-builder.ts", "bootstrap/c420ui/" + "canva-linux-c420ui-builder.cjs"] as const) {
        if (manifest.sourceHashInputs.includes(forbiddenInput)) {
          failures.push(`${manifestPath}: sourceHashInputs must not include ${forbiddenInput}`);
        }
      }
    }

    validateManifestBuildMetadata(rootDir, manifest, failures);

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
  if (fs.existsSync(path.join(rootDir, uiBundlePath))) {
    validateC420UIRuntimeBundleKnownCorruption(read(rootDir, uiBundlePath), failures);
  }
  validateGeneratedArtifactsMatchBuildRecipe(rootDir, [uiBundlePath, cliBundlePath, builderBundlePath], failures);
  validateBlessedRuntimeAssetsMatchPackage(rootDir, blessedRuntimeAssets, failures);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

main();
