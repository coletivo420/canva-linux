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
  C420UI_BOOTSTRAP_FUTURE_MODULE_FORMAT,
  C420UI_BOOTSTRAP_MODULE_FORMAT,
} from "../../c420ui-adapter/bootstrap/build-recipe";
import {
  calculateC420UIBootstrapSourceHash,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "../../c420ui-adapter/bootstrap/source-hash";
import { loadEffectiveBuildMetadata } from "../../c420ui-adapter/build-metadata-loader";

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
  "bootstrap/c420ui/run-c420ui.cjs appears structurally corrupted: host-dependency validators were interleaved into the interactive action runner. Regenerate bootstrap from TypeScript sources.";
const C420UI_RUNTIME_SYNTAX_MESSAGE =
  "c420ui bootstrap bundle failed syntax validation. Regenerate bootstrap from TypeScript sources.";
const C420UI_GENERATED_ARTIFACTS_STALE_MESSAGE =
  "Generated c420ui bootstrap artifacts are stale. Run npm run build:c420ui-bootstrap.";
const C420UI_METADATA_MISMATCH_MESSAGE =
  "c420ui manifest/build metadata mismatch. Run npm run build:metadata && npm run build:c420ui-bootstrap before running the strict artifact gate.";

const C420UI_BOOTSTRAP_ARTIFACTS = [
  "run-c420ui.cjs",
  "run-c420ui-cli.cjs",
  "c420ui-builder.cjs",
] as const;

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
    failures.push("bootstrap/c420ui/run-c420ui.cjs: requestLocatorPosition is corrupted; regenerate bootstrap from TypeScript sources.");
  }

  if (/function crc32\(buf\)[\s\S]{0,800}(?:fs\d*\.readFileSync|path\d*\.resolve)/.test(content)) {
    failures.push("bootstrap/c420ui/run-c420ui.cjs: crc32 is corrupted with injected file IO; regenerate bootstrap from TypeScript sources.");
  }

  const progressStateStart = content.indexOf("function toProgressState(state)");
  const progressStateEnd = content.indexOf("function createInteractiveActionRunner", progressStateStart);
  const progressStateBlock = progressStateStart === -1 || progressStateEnd === -1
    ? ""
    : content.slice(progressStateStart, progressStateEnd);
  if (/event\.type === "action:start"/.test(progressStateBlock)) {
    failures.push("bootstrap/c420ui/run-c420ui.cjs: toProgressState is corrupted with action event handler logic; regenerate bootstrap from TypeScript sources.");
  }

  const codePointAtStart = content.indexOf("exports2.codePointAt = function");
  const codePointAtEnd = content.indexOf("exports2.fromCodePoint", codePointAtStart);
  const codePointAtBlock = codePointAtStart === -1 || codePointAtEnd === -1
    ? ""
    : content.slice(codePointAtStart, codePointAtEnd);
  if (codePointAtStart === -1 || codePointAtEnd === -1) {
    failures.push("bootstrap/c420ui/run-c420ui.cjs: codePointAt polyfill block must exist.");
    return;
  }

  const codePointAtSizeIndex = codePointAtBlock.indexOf("var size = string.length;");
  const codePointAtUseIndex = codePointAtBlock.indexOf("index < 0 || index >= size");
  if (
    codePointAtSizeIndex === -1 ||
    codePointAtUseIndex === -1 ||
    codePointAtSizeIndex > codePointAtUseIndex
  ) {
    failures.push(
      "bootstrap/c420ui/run-c420ui.cjs: codePointAt polyfill must define var size = string.length before size is used.",
    );
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
  const manifestPath = "bootstrap/c420ui/manifest.json";

  if (manifest.generatedBy !== C420UI_BOOTSTRAP_BUILD_RECIPE) {
    failures.push(`${manifestPath}: generatedBy must be ${C420UI_BOOTSTRAP_BUILD_RECIPE}`);
  }

  const artifactHashes = manifest.artifactHashes;
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    failures.push(`${manifestPath}: artifactHashes must record generated bootstrap artifact hashes`);
    return;
  }

  const hashes = artifactHashes as Record<string, unknown>;
  for (const artifact of C420UI_BOOTSTRAP_ARTIFACTS) {
    const relativePath = `bootstrap/c420ui/${artifact}`;
    const expectedHash = hashes[artifact];
    if (typeof expectedHash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(expectedHash)) {
      failures.push(`${manifestPath}: artifactHashes.${artifact} must be a sha256 hash`);
      continue;
    }
    if (!fs.existsSync(path.join(rootDir, relativePath))) continue;

    const actualHash = calculateFileHash(rootDir, relativePath);
    if (actualHash !== expectedHash) {
      failures.push(`${relativePath}: artifact hash differs from ${manifestPath}; regenerate bootstrap from TypeScript sources`);
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
      failures.push(`bootstrap/c420ui: unable to regenerate bootstrap artifacts for comparison (${summarizeCommandFailure(result)})`);
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
  const metadataPath = "config/canva-linux/build-metadata.json";
  const packagedMetadata = readJson<BuildMetadataJson>(rootDir, metadataPath);
  if (!packagedMetadata) {
    failures.push(`${metadataPath}: missing generated build metadata for c420ui bootstrap consistency checks`);
    return;
  }

  for (const [manifestField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
    if (typeof manifest[manifestField] !== "string" || manifest[manifestField] === "") {
      failures.push(`bootstrap/c420ui/manifest.json: ${manifestField} must be a non-empty string`);
    }
  }

  if (!isStrictManifestMetadataGate()) return;

  const effectiveMetadata = loadEffectiveBuildMetadata(rootDir);
  for (const [manifestField, metadataField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
    const metadataValue = packagedMetadata[metadataField];
    if (manifest[manifestField] !== metadataValue) {
      failures.push(
        `${C420UI_METADATA_MISMATCH_MESSAGE} ${manifestField} must match ${metadataPath} ${metadataField}.`,
      );
    }
  }

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
      generatedBy: C420UI_BOOTSTRAP_BUILD_RECIPE,
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
    validateManifestArtifactHashes(rootDir, manifest, failures);

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

if (require.main === module) main();
