import * as esbuild from "esbuild";
import fs from "node:fs";
import { createRequire } from "node:module";
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
} from "./canva-linux/bootstrap/build-recipe";
import {
  calculateC420UIBootstrapSourceHash,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "./canva-linux/bootstrap/source-hash";

type PackageJson = {
  version?: string;
};

type BuildMetadata = {
  buildRevision?: string;
  fullVersion?: string;
  displayVersion?: string;
  phase?: string;
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
  const bootstrapDir = path.join(rootDir, "bootstrap", "c420ui");
  fs.mkdirSync(bootstrapDir, { recursive: true });

  const rootPackageJson = readJson<PackageJson>(rootDir, "package.json");
  const c420uiPackageJson = readJson<PackageJson>(rootDir, "packages/c420ui/package.json");
  const buildMetadata = readJson<BuildMetadata>(rootDir, "config/canva-linux/build-metadata.json");
  const dependentProjectVersion = requirePackageVersion(rootPackageJson, "package.json");
  const c420uiVersion = requirePackageVersion(c420uiPackageJson, "packages/c420ui/package.json");

  await esbuild.build(createC420UIBootstrapBuildOptions(rootDir, bootstrapDir));
  copyBlessedRuntimeAssets(rootDir, bootstrapDir);

  const sourceHash = calculateC420UIBootstrapSourceHash(rootDir);

  const manifest = {
    kind: "c420ui-bootstrap",
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
