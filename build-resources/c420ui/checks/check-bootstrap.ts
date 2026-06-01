import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  C420UI_BOOTSTRAP_MODULE_FORMAT,
} from "../bootstrap/build-recipe";
import {
  calculateC420UISourceHash,
  C420UI_SOURCE_HASH_ALGORITHM,
  C420UI_SOURCE_HASH_INPUTS,
} from "../bootstrap/source-hash";
import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  c420uiBootstrapArtifactPath,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
} from "./bootstrap-check-helpers";
import { loadEffectiveBuildMetadata } from "../../canva-linux/c420ui-adapter/build-metadata-loader";

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
  `${c420uiBootstrapArtifactPath("run-c420ui.mjs")} appears structurally corrupted: host-dependency validators were interleaved into the interactive action runner. Regenerate bootstrap from TypeScript sources.`;
const C420UI_RUNTIME_SYNTAX_MESSAGE =
  "c420ui bootstrap bundle failed syntax validation. Regenerate bootstrap from TypeScript sources.";
const C420UI_GENERATED_ARTIFACTS_STALE_MESSAGE =
  "Generated c420ui bootstrap artifacts are stale. Run npm run build:c420ui-bootstrap.";
const C420UI_METADATA_MISMATCH_MESSAGE =
  "c420ui manifest/build metadata mismatch. Run npm run build:metadata && npm run build:c420ui-bootstrap before running the strict artifact gate.";

const C420UI_MANIFEST_METADATA_FIELD_MAPPING = [
  ["dependentProjectBuildRevision", "buildRevision"],
  ["dependentProjectFullVersion", "fullVersion"],
  ["dependentProjectDisplayVersion", "displayVersion"],
  ["dependentProjectPhase", "phase"],
] as const;

function validateC420UIRuntimeBundleKnownCorruption(content: string, failures: string[]): void {
  const malformedSigcontClosure = /process\.once\("SIGCONT", function\(\) \{[\s\S]{0,600}?\n\s*};\s*\n\s*process\.kill\(process\.pid, "SIGTSTP"\)/.test(content);
  const interactiveRunnerStart = content.indexOf("function createInteractiveActionRunner(options) {");
  const interactiveRunnerEnd = content.indexOf("var init_interactive_action_runner", interactiveRunnerStart);
  const interactiveRunnerBlock = interactiveRunnerStart === -1 || interactiveRunnerEnd === -1
    ? ""
    : content.slice(interactiveRunnerStart, interactiveRunnerEnd);
  const assertOptionalInjectedInInteractiveRunner = /function assertOptional(?:Boolean|String|StringArray|PurposeArray)\b/.test(interactiveRunnerBlock);
  const hostValidatorsNearRunnerState = /(?:createInteractiveActionRunner|runAction|cancel|options\.appendLogText|state\.progressState)[\s\S]{0,2000}function assertOptional(?:Boolean|String|StringArray|PurposeArray)\b/.test(interactiveRunnerBlock);

  if (malformedSigcontClosure || assertOptionalInjectedInInteractiveRunner || hostValidatorsNearRunnerState) {
    failures.push(C420UI_RUNTIME_CORRUPTION_MESSAGE);
  }

  const requestLocatorStart = content.indexOf("requestLocatorPosition");
  const requestLocatorEnd = content.indexOf("Program.prototype.decic", requestLocatorStart);
  const requestLocatorBlock = requestLocatorStart === -1 || requestLocatorEnd === -1
    ? ""
    : content.slice(requestLocatorStart, requestLocatorEnd);
  if (/return out;/.test(requestLocatorBlock)) {
    failures.push(`${c420uiBootstrapArtifactPath("run-c420ui.mjs")}: requestLocatorPosition is corrupted; regenerate bootstrap from TypeScript sources.`);
  }

  if (/function crc32\(buf\)[\s\S]{0,800}(?:fs\d*\.readFileSync|path\d*\.resolve)/.test(content)) {
    failures.push(`${c420uiBootstrapArtifactPath("run-c420ui.mjs")}: crc32 is corrupted with injected file IO; regenerate bootstrap from TypeScript sources.`);
  }

  const progressStateStart = content.indexOf("function toProgressState(state)");
  const progressStateEnd = content.indexOf("function createInteractiveActionRunner", progressStateStart);
  const progressStateBlock = progressStateStart === -1 || progressStateEnd === -1
    ? ""
    : content.slice(progressStateStart, progressStateEnd);
  if (/event\.type === "action:start"/.test(progressStateBlock)) {
    failures.push(`${c420uiBootstrapArtifactPath("run-c420ui.mjs")}: toProgressState is corrupted with action event handler logic; regenerate bootstrap from TypeScript sources.`);
  }

  // ESM output may optimize/reshape this polyfill block depending on esbuild
  // version and target; keep corruption checks above but avoid hard-coding this
  // specific emitted snippet.
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
    failures.push(`${relativePath}: ${C420UI_RUNTIME_SYNTAX_MESSAGE} (${summarizeCommandFailure(result)})`);
  }
}

function calculateFileHash(rootDir: string, relativePath: string): string {
  return `sha256:${createHash("sha256")
    .update(fs.readFileSync(path.join(rootDir, relativePath)))
    .digest("hex")}`;
}

export function validateManifestArtifactHashes(
  rootDir: string,
  manifest: Record<string, unknown>,
  failures: string[],
): void {
  if (manifest.generatedBy !== C420UI_BOOTSTRAP_BUILD_RECIPE) {
    failures.push(`${C420UI_BOOTSTRAP_MANIFEST_PATH}: generatedBy must be ${C420UI_BOOTSTRAP_BUILD_RECIPE}`);
  }

  const artifactHashes = manifest.artifactHashes;
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    failures.push(`${C420UI_BOOTSTRAP_MANIFEST_PATH}: artifactHashes must record generated bootstrap artifact hashes`);
    return;
  }

  const hashes = artifactHashes as Record<string, unknown>;
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    const relativePath = c420uiBootstrapArtifactPath(artifact);
    const expectedHash = hashes[artifact];
    if (typeof expectedHash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(expectedHash)) {
      failures.push(`${C420UI_BOOTSTRAP_MANIFEST_PATH}: artifactHashes.${artifact} must be a sha256 hash`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, relativePath))) continue;

    const actualHash = calculateFileHash(rootDir, relativePath);
    if (actualHash !== expectedHash) {
      failures.push(`${relativePath}: artifact hash differs from ${C420UI_BOOTSTRAP_MANIFEST_PATH}; regenerate bootstrap from TypeScript sources`);
    }
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

function compareGeneratedArtifacts(
  rootDir: string,
  expectedBootstrapDir: string,
  relativePaths: readonly string[],
  failures: string[],
): void {
  for (const relativePath of relativePaths) {
    const generatedPath = path.join(expectedBootstrapDir, path.basename(relativePath));
    const committedPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(generatedPath) || !fs.existsSync(committedPath)) continue;

    const generated = fs.readFileSync(generatedPath);
    const committed = fs.readFileSync(committedPath);
    if (!generated.equals(committed)) {
      failures.push(`${relativePath}: ${C420UI_GENERATED_ARTIFACTS_STALE_MESSAGE}`);
    }
  }
}

function validateGeneratedArtifactsMatchBuildRecipe(
  rootDir: string,
  relativePaths: readonly string[],
  failures: string[],
): void {
  const expectedBootstrapDir = process.env.CANVA_C420UI_EXPECTED_BOOTSTRAP_DIR;
  if (expectedBootstrapDir) {
    compareGeneratedArtifacts(rootDir, expectedBootstrapDir, relativePaths, failures);
    return;
  }

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
      failures.push(`build-resources/c420ui/bootstrap/generated: unable to regenerate bootstrap artifacts for comparison (${summarizeCommandFailure(result)})`);
      return;
    }

    compareGeneratedArtifacts(rootDir, tempDir, relativePaths, failures);
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
  version?: string;
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

function isStrictManifestMetadataGate(): boolean {
  return process.env.CANVA_STRICT_C420UI_ARTIFACT_METADATA === "1";
}

function validateManifestBuildMetadata(
  rootDir: string,
  manifest: BootstrapManifestBuildMetadata,
  failures: string[],
): void {
  const metadataPath = "build-resources/canva-linux/config/build-metadata.json";
  const packagedMetadata = readJson<BuildMetadataJson>(rootDir, metadataPath);
  if (!packagedMetadata) {
    failures.push(`${metadataPath}: missing generated build metadata for c420ui bootstrap consistency checks`);
    return;
  }

  for (const [manifestField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
    if (typeof manifest[manifestField] !== "string" || manifest[manifestField] === "") {
      failures.push(`${C420UI_BOOTSTRAP_MANIFEST_PATH}: ${manifestField} must be a non-empty string`);
    }
  }

  if (packagedMetadata.buildRevision !== "unknown") {
    failures.push(`${metadataPath}: committed buildRevision must be unknown`);
  }

  for (const field of ["fullVersion", "displayVersion", "phase", "version"] as const) {
    const value = packagedMetadata[field];
    if (typeof value === "string" && /\+g[0-9a-f]{7}$/i.test(value)) {
      failures.push(`${metadataPath}: committed ${field} must not include +g hash`);
    }
  }

  for (const [manifestField, metadataField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
    const metadataValue = packagedMetadata[metadataField];
    if (manifest[manifestField] !== metadataValue) {
      failures.push(
        `${C420UI_BOOTSTRAP_MANIFEST_PATH}: ${manifestField} must match committed metadata ${metadataPath} ${metadataField}.`,
      );
    }
  }

  if (!isStrictManifestMetadataGate()) return;

  const effectiveMetadata = loadEffectiveBuildMetadata(rootDir);

  if (manifest.dependentProjectBuildRevision !== effectiveMetadata.buildRevision) {
    failures.push(
      `${C420UI_METADATA_MISMATCH_MESSAGE} dependentProjectBuildRevision must match loadEffectiveBuildMetadata(rootDir).buildRevision.`,
    );
  }
  if (manifest.dependentProjectFullVersion !== effectiveMetadata.fullVersion) {
    failures.push(
      `${C420UI_METADATA_MISMATCH_MESSAGE} dependentProjectFullVersion must match loadEffectiveBuildMetadata(rootDir).fullVersion.`,
    );
  }
}

function main(): void {
  const rootDir = findProjectRoot();
  const failures: string[] = [];
  const manifestPath = C420UI_BOOTSTRAP_MANIFEST_PATH;
  const uiBundlePath = c420uiBootstrapArtifactPath("run-c420ui.mjs");
  const cliBundlePath = c420uiBootstrapArtifactPath("run-c420ui-cli.mjs");
  const builderBundlePath = c420uiBootstrapArtifactPath("c420ui-builder.mjs");
  const blessedRuntimeAssets = C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS.map(
    (asset) => `build-resources/c420ui/bootstrap/usr/${asset}`,
  );

  for (const relativePath of [manifestPath, uiBundlePath, cliBundlePath, builderBundlePath, ...blessedRuntimeAssets]) {
    fileExistsAndIsNotEmpty(rootDir, relativePath, failures);
  }

  for (const forbiddenPath of [
    c420uiBootstrapArtifactPath("canva-linux-c420ui-builder.mjs"),
    "scripts/" + "canva-linux-c420ui-builder.ts",
  ] as const) {
    if (fs.existsSync(path.join(rootDir, forbiddenPath))) {
      failures.push(`${forbiddenPath}: old Canva Linux-specific internal builder artifact must not exist`);
    }
  }

  if (fs.existsSync(path.join(rootDir, manifestPath))) {
    const manifest = JSON.parse(read(rootDir, manifestPath)) as Record<string, unknown>;
    const rootPackageJson = JSON.parse(read(rootDir, "package.json")) as { version?: string };
    const c420uiPackageJson = JSON.parse(read(rootDir, "build-resources/c420ui/package.json")) as { version?: string };

    if ("version" in manifest) {
      failures.push(`${manifestPath}: use c420uiVersion and dependentProjectVersion instead of ambiguous version`);
    }
    if (c420uiPackageJson.version === rootPackageJson.version) {
      failures.push("build-resources/c420ui/package.json: c420ui version must stay distinct from the dependent project version");
    }

    const expected: Record<string, unknown> = {
      kind: "c420ui-bootstrap",
      generatedBy: C420UI_BOOTSTRAP_BUILD_RECIPE,
      c420uiVersion: c420uiPackageJson.version,
      dependentProject: "canva-linux",
      dependentProjectVersion: rootPackageJson.version,
      entrypoint: "run-c420ui.mjs",
      cliEntrypoint: "run-c420ui-cli.mjs",
      requiresNode: ">=22.0.0",
      buildRecipe: C420UI_BOOTSTRAP_BUILD_RECIPE,
      buildTool: C420UI_BOOTSTRAP_BUILD_TOOL,
      buildTarget: C420UI_BOOTSTRAP_BUILD_TARGET,
      bundleFormat: C420UI_BOOTSTRAP_BUNDLE_FORMAT,
      moduleFormat: C420UI_BOOTSTRAP_MODULE_FORMAT,
      typescriptFirst: true,
      ownsFullDependencyPolicy: true,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (manifest[key] !== value) {
        failures.push(`${manifestPath}: expected ${key} to be ${JSON.stringify(value)}`);
      }
    }

    const entrypoints = manifest.entrypoints as Record<string, unknown> | undefined;
    if (entrypoints?.ui !== c420uiBootstrapArtifactPath("run-c420ui.mjs")) {
      failures.push(`${manifestPath}: expected entrypoints.ui to be ${c420uiBootstrapArtifactPath("run-c420ui.mjs")}`);
    }
    if (entrypoints?.cli !== c420uiBootstrapArtifactPath("run-c420ui-cli.mjs")) {
      failures.push(`${manifestPath}: expected entrypoints.cli to be ${c420uiBootstrapArtifactPath("run-c420ui-cli.mjs")}`);
    }
    if (entrypoints?.builder !== c420uiBootstrapArtifactPath("c420ui-builder.mjs")) {
      failures.push(`${manifestPath}: expected entrypoints.builder to be ${c420uiBootstrapArtifactPath("c420ui-builder.mjs")}`);
    }

    if (manifest.c420uiSourceHashAlgorithm !== C420UI_SOURCE_HASH_ALGORITHM) {
      failures.push(`${manifestPath}: expected c420uiSourceHashAlgorithm to be ${C420UI_SOURCE_HASH_ALGORITHM}`);
    }

    if (typeof manifest.c420uiSourceHash !== "string" || !manifest.c420uiSourceHash.startsWith("sha256:")) {
      failures.push(`${manifestPath}: expected c420uiSourceHash to start with sha256:`);
    }
    if (typeof manifest.canvaLinuxSourceHash !== "string" || !manifest.canvaLinuxSourceHash.startsWith("sha256:")) {
      failures.push(`${manifestPath}: expected canvaLinuxSourceHash to start with sha256:`);
    }
    if (typeof manifest.combinedSourceHash !== "string" || !manifest.combinedSourceHash.startsWith("sha256:")) {
      failures.push(`${manifestPath}: expected combinedSourceHash to start with sha256:`);
    }

    if (!Array.isArray(manifest.c420uiSourceHashInputs)) {
      failures.push(`${manifestPath}: expected c420uiSourceHashInputs to be an array`);
    } else {
      for (const requiredInput of C420UI_SOURCE_HASH_INPUTS) {
        if (!manifest.c420uiSourceHashInputs.includes(requiredInput)) {
          failures.push(`${manifestPath}: c420uiSourceHashInputs must include ${requiredInput}`);
        }
      }
      for (const forbiddenInput of ["scripts/" + "canva-linux-c420ui-builder.ts", c420uiBootstrapArtifactPath("canva-linux-c420ui-builder.mjs")] as const) {
        if (manifest.c420uiSourceHashInputs.includes(forbiddenInput)) {
          failures.push(`${manifestPath}: c420uiSourceHashInputs must not include ${forbiddenInput}`);
        }
      }
    }

    validateManifestBuildMetadata(rootDir, manifest, failures);
    validateManifestArtifactHashes(rootDir, manifest, failures);

    try {
      const currentSourceHash = calculateC420UISourceHash(rootDir);
      if (manifest.c420uiSourceHash !== currentSourceHash) {
        failures.push(`${manifestPath}: c420uiSourceHash is stale; run npm run build:c420ui-bootstrap`);
      }
    } catch (error) {
      failures.push(`${manifestPath}: unable to calculate c420uiSourceHash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const interactiveEntrypoint = read(rootDir, "build-resources/c420ui/scripts/run-c420ui.ts");
  for (const forbidden of ["ensureCanvaLinuxHostDependencies", "isC420UIHostDependencyFailure"]) {
    if (interactiveEntrypoint.includes(forbidden)) {
      failures.push(`build-resources/c420ui/scripts/run-c420ui.ts: must not resolve dependent project dependencies before starting c420ui (${forbidden})`);
    }
  }

  const adapterRun = read(rootDir, "build-resources/canva-linux/c420ui-adapter/run.ts");
  for (const fragment of ["startupTasks", "Checking dependent project dependencies", "ensureCanvaLinuxHostDependencies"]) {
    if (!adapterRun.includes(fragment)) {
      failures.push(`build-resources/canva-linux/c420ui-adapter/run.ts: missing startup dependency task fragment ${fragment}`);
    }
  }

  const launcher = read(rootDir, "canva-linux-c420ui-builder");
  const bootstrapBuilderIndex = indexOfRequired(launcher, c420uiBootstrapArtifactPath("c420ui-builder.mjs"), failures, "canva-linux-c420ui-builder");
  const buildBuilderIndex = indexOfRequired(launcher, ".build/scripts/c420ui-builder.mjs", failures, "canva-linux-c420ui-builder");

  if (bootstrapBuilderIndex !== -1 && buildBuilderIndex !== -1 && bootstrapBuilderIndex > buildBuilderIndex) {
    failures.push(`canva-linux-c420ui-builder: launcher must check ${c420uiBootstrapArtifactPath("c420ui-builder.mjs")} before .build fallback`);
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

if (/check-bootstrap\.(mjs|js|ts)$/.test(process.argv[1] || "")) main();
