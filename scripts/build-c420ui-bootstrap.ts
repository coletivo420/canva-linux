import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";

import {
  calculateC420UIBootstrapSourceHash,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "./canva-linux/bootstrap/source-hash";

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

async function main(): Promise<void> {
  const rootDir = findProjectRoot();
  const bootstrapDir = path.join(rootDir, "bootstrap", "c420ui");
  fs.mkdirSync(bootstrapDir, { recursive: true });

  await esbuild.build({
    bundle: true,
    entryNames: "[name]",
    entryPoints: ["scripts/run-c420ui.ts", "scripts/run-c420ui-cli.ts"],
    external: ["electron", "term.js", "pty.js"],
    format: "cjs",
    outExtension: { ".js": ".cjs" },
    outdir: bootstrapDir,
    platform: "node",
    target: "node22",
  });

  const rootPackageJson = readJson<PackageJson>(rootDir, "package.json");
  const c420uiPackageJson = readJson<PackageJson>(rootDir, "packages/c420ui/package.json");
  const sourceHash = calculateC420UIBootstrapSourceHash(rootDir);

  const manifest = {
    kind: "c420ui-bootstrap",
    c420uiVersion: c420uiPackageJson.version,
    dependentProject: "canva-linux",
    dependentProjectVersion: rootPackageJson.version,
    entrypoint: "run-c420ui.cjs",
    cliEntrypoint: "run-c420ui-cli.cjs",
    requiresNode: ">=22.0.0",
    moduleFormat: "commonjs",
    futureModuleFormat: "esm",
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
