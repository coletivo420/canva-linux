import * as esbuild from "esbuild";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

import {
  C420UI_BOOTSTRAP_BUILD_RECIPE,
  C420UI_BOOTSTRAP_BUILD_TARGET,
  C420UI_BOOTSTRAP_BUILD_TOOL,
  C420UI_BOOTSTRAP_BUNDLE_FORMAT,
  C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS,
  createC420UIBootstrapBuildOptions,
  C420UI_BOOTSTRAP_FUTURE_MODULE_FORMAT,
  C420UI_BOOTSTRAP_MODULE_FORMAT,
} from "./c420ui-adapter/bootstrap/build-recipe";
import {
  calculateC420UIBootstrapSourceHash,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "./c420ui-adapter/bootstrap/source-hash";
import { loadEffectiveBuildMetadata } from "./c420ui-adapter/build-metadata-loader";
import {
  calculateFileHash,
  C420UI_BOOTSTRAP_ARTIFACTS,
} from "./checks/canva-linux/c420ui-bootstrap-check-helpers";

type PackageJson = {
  version?: string;
};

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

function resolveBootstrapDir(rootDir: string): string {
  return process.env.C420UI_BOOTSTRAP_OUT_DIR
    ? path.resolve(rootDir, process.env.C420UI_BOOTSTRAP_OUT_DIR)
    : path.join(rootDir, "bootstrap", "c420ui");
}

function assertSafeBootstrapOutputDir(rootDir: string, bootstrapDir: string): void {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedOut = path.resolve(bootstrapDir);
  const tmpRoot = path.resolve(os.tmpdir());

  const forbidden = new Set([
    resolvedRoot,
    path.dirname(resolvedRoot),
    path.parse(resolvedOut).root,
    process.cwd(),
    path.resolve(rootDir, "."),
    path.resolve(rootDir, ".."),
  ]);

  if (forbidden.has(resolvedOut)) {
    throw new Error(`Refusing to clean unsafe c420ui bootstrap output directory: ${resolvedOut}`);
  }

  const relative = path.relative(resolvedRoot, resolvedOut);
  const insideRepo = relative && !relative.startsWith("..") && !path.isAbsolute(relative);
  const insideTemp = resolvedOut === tmpRoot || resolvedOut.startsWith(`${tmpRoot}${path.sep}`);

  if (!insideRepo && !insideTemp) {
    throw new Error(`Refusing to clean c420ui bootstrap output outside repository/temp: ${resolvedOut}`);
  }

  if (
    path.basename(resolvedOut) !== "c420ui" &&
    !path.basename(resolvedOut).startsWith("c420ui-")
  ) {
    throw new Error(`c420ui bootstrap output must be a dedicated c420ui directory: ${resolvedOut}`);
  }
}

function cleanBootstrapOutput(bootstrapDir: string): void {
  fs.rmSync(bootstrapDir, { recursive: true, force: true });
  fs.mkdirSync(bootstrapDir, { recursive: true });
}

function calculateArtifactHashes(bootstrapDir: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const relativePath of C420UI_BOOTSTRAP_ARTIFACTS) {
    const artifact = path.basename(relativePath);
    hashes[artifact] = calculateFileHash(path.join(bootstrapDir, artifact));
  }
  return hashes;
}

async function ensureBuildMetadataModule(rootDir: string): Promise<void> {
  await esbuild.build({
    entryPoints: [path.join(rootDir, "electron", "main", "build-metadata.ts")],
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    outfile: path.join(rootDir, ".build", "electron", "main", "build-metadata.js"),
  });
}

function copyBlessedRuntimeAssets(rootDir: string, bootstrapDir: string): void {
  const requireFromRoot = createRequire(path.join(rootDir, "package.json"));
  const blessedPackageJsonPath = requireFromRoot.resolve("blessed/package.json");
  const blessedUsrDir = path.join(path.dirname(blessedPackageJsonPath), "usr");
  const bootstrapUsrDir = path.join(path.dirname(bootstrapDir), "usr");

  fs.rmSync(bootstrapUsrDir, { recursive: true, force: true });
  fs.mkdirSync(bootstrapUsrDir, { recursive: true });

  for (const relativeAsset of C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS) {
    fs.copyFileSync(
      path.join(blessedUsrDir, relativeAsset),
      path.join(bootstrapUsrDir, relativeAsset),
    );
  }
}

async function main(): Promise<void> {
  const rootDir = findProjectRoot();
  const bootstrapDir = resolveBootstrapDir(rootDir);
  assertSafeBootstrapOutputDir(rootDir, bootstrapDir);
  cleanBootstrapOutput(bootstrapDir);

  const rootPackageJson = readJson<PackageJson>(rootDir, "package.json");
  const c420uiPackageJson = readJson<PackageJson>(rootDir, "packages/c420ui/package.json");
  await ensureBuildMetadataModule(rootDir);
  const buildMetadata = loadEffectiveBuildMetadata(rootDir);
  const dependentProjectVersion = requirePackageVersion(rootPackageJson, "package.json");
  const c420uiVersion = requirePackageVersion(c420uiPackageJson, "packages/c420ui/package.json");

  await esbuild.build(createC420UIBootstrapBuildOptions(rootDir, bootstrapDir));
  copyBlessedRuntimeAssets(rootDir, bootstrapDir);

  const sourceHash = calculateC420UIBootstrapSourceHash(rootDir);
  const artifactHashes = calculateArtifactHashes(bootstrapDir);

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
    sourceHash,
    sourceHashInputs: [...C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS],
    artifactHashes,
  };

  fs.writeFileSync(
    path.join(bootstrapDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
