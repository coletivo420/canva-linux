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

type PackageJson = {
  version?: string;
};

type ArtifactComparison = {
  committedRelativePath: string;
  expectedRelativePath: string;
};

type BuildMetadataJson = {
  buildRevision?: string;
  fullVersion?: string;
  displayVersion?: string;
  phase?: string;
};

const C420UI_BOOTSTRAP_ARTIFACTS = [
  "bootstrap/c420ui/run-c420ui.cjs",
  "bootstrap/c420ui/run-c420ui-cli.cjs",
  "bootstrap/c420ui/c420ui-builder.cjs",
] as const;

const C420UI_MANIFEST_METADATA_FIELD_MAPPING = [
  ["dependentProjectBuildRevision", "buildRevision"],
  ["dependentProjectFullVersion", "fullVersion"],
  ["dependentProjectDisplayVersion", "displayVersion"],
  ["dependentProjectPhase", "phase"],
] as const;

function findProjectRoot(): string {
  let current = process.env.CANVA_SCRIPT_REPO_ROOT || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error("Unable to locate project root");
    current = parent;
  }
}

function readJson<T>(rootDir: string, relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as T;
}

function requirePackageVersion(packageJson: PackageJson, relativePath: string): string {
  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error(`${relativePath}: missing required version`);
  }
  return packageJson.version;
}

function summarizeCommandFailure(result: ReturnType<typeof spawnSync>): string {
  const output = `${result.stdout?.toString() || ""}${result.stderr?.toString() || ""}`.trim();
  if (result.error) return result.error.message;
  return output.split("\n").find((line) => line.trim().length > 0)?.trim() || `exit status ${result.status}`;
}

function runNodeCheck(rootDir: string, relativePath: string): void {
  const result = spawnSync(process.execPath, ["--check", path.join(rootDir, relativePath)], {
    cwd: rootDir,
    encoding: "utf8",
    shell: false,
  });

  if (result.error || result.status !== 0) {
    throw new Error(`${relativePath}: node --check failed (${summarizeCommandFailure(result)})`);
  }

  console.log(`[ok] node --check ${relativePath}`);
}

function runGitDiffCheck(rootDir: string, label: string): void {
  for (const args of [
    ["diff", "--exit-code"],
    ["diff", "--cached", "--exit-code"],
  ] as const) {
    const result = spawnSync("git", args, {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
    });

    if (result.error || result.status !== 0) {
      throw new Error(`worktree must stay clean after ${label}; ${args.join(" ")} failed (${summarizeCommandFailure(result)})`);
    }
  }
}

function copyBlessedRuntimeAssets(rootDir: string, expectedBootstrapDir: string): void {
  const requireFromRoot = createRequire(path.join(rootDir, "package.json"));
  const blessedPackageJsonPath = requireFromRoot.resolve("blessed/package.json");
  const blessedUsrDir = path.join(path.dirname(blessedPackageJsonPath), "usr");
  const expectedUsrDir = path.join(path.dirname(expectedBootstrapDir), "usr");

  fs.mkdirSync(expectedUsrDir, { recursive: true });
  for (const relativeAsset of C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS) {
    fs.copyFileSync(
      path.join(blessedUsrDir, relativeAsset),
      path.join(expectedUsrDir, relativeAsset),
    );
  }
}

function calculateFileHash(filePath: string): string {
  return `sha256:${createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex")}`;
}

function calculateBootstrapArtifactHashes(bootstrapDir: string): Record<string, string> {
  const artifactHashes: Record<string, string> = {};
  for (const relativePath of C420UI_BOOTSTRAP_ARTIFACTS) {
    const artifact = path.basename(relativePath);
    artifactHashes[artifact] = calculateFileHash(path.join(bootstrapDir, artifact));
  }
  return artifactHashes;
}

function validateCommittedManifestArtifactHashes(rootDir: string): void {
  const manifestPath = "bootstrap/c420ui/manifest.json";
  const manifest = readJson<Record<string, unknown>>(rootDir, manifestPath);
  const artifactHashes = manifest.artifactHashes;
  const failures: string[] = [];

  if (manifest.generatedBy !== C420UI_BOOTSTRAP_BUILD_RECIPE) {
    failures.push(`${manifestPath}: generatedBy must be ${C420UI_BOOTSTRAP_BUILD_RECIPE}`);
  }

  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    failures.push(`${manifestPath}: artifactHashes must record generated bootstrap artifact hashes`);
  } else {
    const hashes = artifactHashes as Record<string, unknown>;
    for (const relativePath of C420UI_BOOTSTRAP_ARTIFACTS) {
      const artifact = path.basename(relativePath);
      const expectedHash = hashes[artifact];
      if (typeof expectedHash !== "string" || !/^sha256:[0-9a-f]{64}$/.test(expectedHash)) {
        failures.push(`${manifestPath}: artifactHashes.${artifact} must be a sha256 hash`);
        continue;
      }

      const committedPath = path.join(rootDir, relativePath);
      if (!fs.existsSync(committedPath)) continue;

      const actualHash = calculateFileHash(committedPath);
      if (actualHash !== expectedHash) {
        failures.push(`${relativePath}: artifact hash differs from ${manifestPath}; regenerate bootstrap from TypeScript sources`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

function generateExpectedArtifacts(rootDir: string, expectedBootstrapDir: string): void {
  fs.rmSync(expectedBootstrapDir, { recursive: true, force: true });
  fs.mkdirSync(expectedBootstrapDir, { recursive: true });

  const rootPackageJson = readJson<PackageJson>(rootDir, "package.json");
  const c420uiPackageJson = readJson<PackageJson>(rootDir, "packages/c420ui/package.json");
  const packagedBuildMetadata = readJson<BuildMetadataJson>(rootDir, "config/canva-linux/build-metadata.json");
  const effectiveBuildMetadata = loadEffectiveBuildMetadata(rootDir);
  // Artifact validation is intentionally pinned to committed metadata.
  // Runtime/build metadata in a source checkout may still resolve from Git HEAD,
  // but committed bootstrap artifacts must compare against the committed
  // config/canva-linux/build-metadata.json so the gate does not dirty the
  // worktree with the not-yet-materialized commit hash.
  const buildMetadata = {
    ...effectiveBuildMetadata,
    ...packagedBuildMetadata,
  };
  const dependentProjectVersion = requirePackageVersion(rootPackageJson, "package.json");
  const c420uiVersion = requirePackageVersion(c420uiPackageJson, "packages/c420ui/package.json");

  const result = spawnSync(
    "npx",
    ["esbuild", ...createC420UIBootstrapEsbuildCliArgs(expectedBootstrapDir)],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
    },
  );

  if (result.error || result.status !== 0) {
    throw new Error(`unable to generate temporary c420ui bootstrap artifacts (${summarizeCommandFailure(result)})`);
  }

  copyBlessedRuntimeAssets(rootDir, expectedBootstrapDir);
  const artifactHashes = calculateBootstrapArtifactHashes(expectedBootstrapDir);

  const manifest = {
    kind: "c420ui-bootstrap",
    generatedBy: C420UI_BOOTSTRAP_BUILD_RECIPE,
    c420uiVersion,
    dependentProject: "canva-linux",
    dependentProjectVersion,
    dependentProjectBuildRevision: buildMetadata.buildRevision ?? "unknown",
    dependentProjectFullVersion: buildMetadata.fullVersion ?? dependentProjectVersion,
    dependentProjectDisplayVersion:
      buildMetadata.displayVersion ?? dependentProjectVersion,
    dependentProjectPhase: buildMetadata.phase ?? dependentProjectVersion,
    entrypoint: "run-c420ui.cjs",
    cliEntrypoint: "run-c420ui-cli.cjs",
    entrypoints: {
      ui: "bootstrap/c420ui/run-c420ui.cjs",
      cli: "bootstrap/c420ui/run-c420ui-cli.cjs",
      builder: "bootstrap/c420ui/c420ui-builder.cjs",
    },
    requiresNode: ">=22.0.0",
    buildRecipe: C420UI_BOOTSTRAP_BUILD_RECIPE,
    buildTool: C420UI_BOOTSTRAP_BUILD_TOOL,
    buildTarget: C420UI_BOOTSTRAP_BUILD_TARGET,
    bundleFormat: C420UI_BOOTSTRAP_BUNDLE_FORMAT,
    moduleFormat: C420UI_BOOTSTRAP_MODULE_FORMAT,
    futureModuleFormat: C420UI_BOOTSTRAP_FUTURE_MODULE_FORMAT,
    typescriptFirst: true,
    ownsFullDependencyPolicy: true,
    sourceHashAlgorithm: C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
    sourceHash: calculateC420UIBootstrapSourceHash(rootDir),
    sourceHashInputs: [...C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS],
    artifactHashes,
  };

  fs.writeFileSync(
    path.join(expectedBootstrapDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

function compareArtifacts(rootDir: string, expectedBootstrapDir: string, comparisons: readonly ArtifactComparison[]): void {
  const failures: string[] = [];
  for (const comparison of comparisons) {
    const committedPath = path.join(rootDir, comparison.committedRelativePath);
    const expectedPath = path.join(expectedBootstrapDir, comparison.expectedRelativePath);

    if (!fs.existsSync(committedPath)) {
      failures.push(`${comparison.committedRelativePath}: committed artifact is missing`);
      continue;
    }
    if (!fs.existsSync(expectedPath)) {
      failures.push(`${comparison.expectedRelativePath}: expected temporary artifact is missing`);
      continue;
    }

    const committed = fs.readFileSync(committedPath);
    const expected = fs.readFileSync(expectedPath);
    if (!committed.equals(expected)) {
      failures.push(`${comparison.committedRelativePath}: generated artifact is stale; run npm run build:metadata && npm run build:c420ui-bootstrap`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

function validateExpectedManifestMetadata(rootDir: string, expectedBootstrapDir: string): void {
  const manifest = readJson<Record<string, unknown>>(expectedBootstrapDir, "manifest.json");
  const packagedMetadata = readJson<BuildMetadataJson>(rootDir, "config/canva-linux/build-metadata.json");
  const failures: string[] = [];

  for (const [manifestField, metadataField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
    if (manifest[manifestField] !== packagedMetadata[metadataField]) {
      failures.push(`bootstrap/c420ui/manifest.json: ${manifestField} must match committed build metadata ${metadataField}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }
}

function runStructuralBootstrapCheck(rootDir: string, expectedBootstrapDir: string): void {
  const result = spawnSync(
    process.execPath,
    [".build/scripts/checks/canva-linux/check-c420ui-bootstrap.js"],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CANVA_C420UI_EXPECTED_BOOTSTRAP_DIR: expectedBootstrapDir,
      },
      shell: false,
    },
  );

  if (result.error || result.status !== 0) {
    throw new Error(`check-c420ui-bootstrap.js failed (${summarizeCommandFailure(result)})`);
  }
}

function main(): void {
  const rootDir = findProjectRoot();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-artifact-gate-"));
  const expectedBootstrapDir = path.join(tempRoot, "c420ui");

  try {
    runGitDiffCheck(rootDir, "gate startup");

    for (const relativePath of C420UI_BOOTSTRAP_ARTIFACTS) {
      runNodeCheck(rootDir, relativePath);
      runGitDiffCheck(rootDir, `node --check ${relativePath}`);
    }

    validateCommittedManifestArtifactHashes(rootDir);
    generateExpectedArtifacts(rootDir, expectedBootstrapDir);
    runGitDiffCheck(rootDir, "temporary artifact generation");

    compareArtifacts(rootDir, expectedBootstrapDir, [
      ...C420UI_BOOTSTRAP_ARTIFACTS.map((committedRelativePath) => ({
        committedRelativePath,
        expectedRelativePath: path.basename(committedRelativePath),
      })),
      {
        committedRelativePath: "bootstrap/c420ui/manifest.json",
        expectedRelativePath: "manifest.json",
      },
    ]);
    validateExpectedManifestMetadata(rootDir, expectedBootstrapDir);
    runStructuralBootstrapCheck(rootDir, expectedBootstrapDir);
    runGitDiffCheck(rootDir, "c420ui artifact gate");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
