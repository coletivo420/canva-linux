import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS,
  createC420UIBootstrapEsbuildCliArgs,
} from "../scripts/c420ui-adapter/bootstrap/build-recipe";
import {
  calculateC420UIBootstrapSourceHash,
  collectC420UIBootstrapSourceHashFiles,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "../scripts/c420ui-adapter/bootstrap/source-hash";

const bootstrapDir = path.join("bootstrap", "c420ui");
const manifestPath = path.join(bootstrapDir, "manifest.json");
const uiEntrypoint = path.join(bootstrapDir, "run-c420ui.cjs");
const cliEntrypoint = path.join(bootstrapDir, "run-c420ui-cli.cjs");
const blessedRuntimeAssets = C420UI_BOOTSTRAP_BLESSED_RUNTIME_ASSETS.map(
  (asset) => path.join("bootstrap", "usr", asset),
);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

test("c420ui bootstrap manifest exists and matches package metadata", () => {
  const manifest = readJson<{
    kind: string;
    c420uiVersion: string;
    dependentProject: string;
    dependentProjectVersion: string;
    entrypoint: string;
    cliEntrypoint: string;
    requiresNode: string;
    buildRecipe: string;
    buildTool: string;
    buildTarget: string;
    bundleFormat: string;
    moduleFormat: string;
    futureModuleFormat: string;
    sourceHashAlgorithm: string;
    sourceHash: string;
    sourceHashInputs: string[];
  }>(manifestPath);
  const rootPackageJson = readJson<{ version: string }>("package.json");
  const c420uiPackageJson = readJson<{ version: string }>("packages/c420ui/package.json");

  assert.equal(manifest.kind, "c420ui-bootstrap");
  assert.equal(manifest.c420uiVersion, c420uiPackageJson.version);
  assert.equal(manifest.dependentProject, "canva-linux");
  assert.equal(manifest.dependentProjectVersion, rootPackageJson.version);
  assert.notEqual(manifest.c420uiVersion, manifest.dependentProjectVersion);
  assert.equal("version" in manifest, false);
  assert.equal(manifest.entrypoint, "run-c420ui.cjs");
  assert.equal(manifest.cliEntrypoint, "run-c420ui-cli.cjs");
  assert.equal(manifest.requiresNode, ">=22.0.0");
  assert.equal(manifest.buildRecipe, "scripts/build-c420ui-bootstrap.ts");
  assert.equal(manifest.buildTool, "esbuild");
  assert.equal(manifest.buildTarget, "node22");
  assert.equal(manifest.bundleFormat, "cjs");
  assert.equal(manifest.moduleFormat, "commonjs");
  assert.equal(manifest.futureModuleFormat, "esm");
  assert.equal(manifest.sourceHashAlgorithm, C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM);
  assert.match(manifest.sourceHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(Array.isArray(manifest.sourceHashInputs), true);
  for (const requiredInput of C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS) {
    assert.equal(
      manifest.sourceHashInputs.includes(requiredInput),
      true,
      `manifest sourceHashInputs must include ${requiredInput}`,
    );
  }
  assert.equal(
    manifest.sourceHashInputs.includes("scripts/build-c420ui-bootstrap.ts"),
    true,
  );
  assert.equal(
    collectC420UIBootstrapSourceHashFiles(process.cwd()).includes(
      "scripts/c420ui-adapter/bootstrap/source-hash.ts",
    ),
    true,
  );
  assert.equal(manifest.sourceHash, calculateC420UIBootstrapSourceHash(process.cwd()));
});

test("c420ui bootstrap entrypoints exist and are not empty", () => {
  for (const entrypoint of [uiEntrypoint, cliEntrypoint]) {
    const stats = fs.statSync(entrypoint);
    assert.equal(stats.isFile(), true, `${entrypoint} must be a file`);
    assert.ok(stats.size > 0, `${entrypoint} must not be empty`);
  }
});

test("c420ui bootstrap includes blessed runtime terminfo assets", () => {
  for (const runtimeAsset of blessedRuntimeAssets) {
    const stats = fs.statSync(runtimeAsset);
    assert.equal(stats.isFile(), true, `${runtimeAsset} must be a file`);
    assert.ok(stats.size > 0, `${runtimeAsset} must not be empty`);
  }
});

test("c420ui bootstrap blessed runtime assets match installed blessed package", () => {
  const blessedUsrDir = path.join(
    path.dirname(require.resolve("blessed/package.json")),
    "usr",
  );

  for (const runtimeAsset of blessedRuntimeAssets) {
    const relativeAsset = path.relative(path.join("bootstrap", "usr"), runtimeAsset);
    assert.deepEqual(
      fs.readFileSync(runtimeAsset),
      fs.readFileSync(path.join(blessedUsrDir, relativeAsset)),
      `${runtimeAsset} must match node_modules/blessed/usr/${relativeAsset}`,
    );
  }
});

test("c420ui bootstrap bundle excludes full project dependency tooling", () => {
  const forbiddenRuntimeTooling = [
    "electron-builder",
    "@typescript-eslint",
    "playwright",
    "typescript/lib",
  ];

  for (const entrypoint of [uiEntrypoint, cliEntrypoint]) {
    const bundle = fs.readFileSync(entrypoint, "utf8");
    for (const forbidden of forbiddenRuntimeTooling) {
      assert.equal(
        bundle.includes(forbidden),
        false,
        `${entrypoint} must not contain ${forbidden}`,
      );
    }
  }
});


test("interactive run-c420ui entrypoint starts c420ui before dependent dependency repair", () => {
  const entrypointSource = fs.readFileSync(path.join("scripts", "run-c420ui.ts"), "utf8");
  const adapterRunSource = fs.readFileSync(path.join("scripts", "c420ui-adapter", "run.ts"), "utf8");

  assert.equal(entrypointSource.includes("ensureCanvaLinuxHostDependencies"), false);
  assert.equal(entrypointSource.includes("isC420UIHostDependencyFailure"), false);
  assert.match(entrypointSource, /runCanvaLinuxC420UI\(\{/);
  assert.match(adapterRunSource, /startupTasks/);
  assert.match(adapterRunSource, /ensureCanvaLinuxHostDependencies/);
  assert.match(adapterRunSource, /Checking dependent project dependencies/);
});


test("c420ui bootstrap entrypoints are syntactically valid JavaScript", () => {
  for (const entrypoint of [uiEntrypoint, cliEntrypoint]) {
    const result = spawnSync(process.execPath, ["--check", entrypoint], {
      encoding: "utf8",
      shell: false,
    });

    assert.equal(
      result.status,
      0,
      `${entrypoint} must pass node --check: ${result.stderr || result.stdout}`,
    );
  }
});

test("c420ui bootstrap entrypoints match the build recipe", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "c420ui-bootstrap-test-"));

  try {
    const result = spawnSync(
      "npx",
      ["esbuild", ...createC420UIBootstrapEsbuildCliArgs(tempDir)],
      {
        encoding: "utf8",
        shell: false,
      },
    );

    assert.equal(
      result.status,
      0,
      `bootstrap recipe rebuild must succeed: ${result.stderr || result.stdout}`,
    );

    for (const entrypoint of [uiEntrypoint, cliEntrypoint]) {
      assert.deepEqual(
        fs.readFileSync(entrypoint),
        fs.readFileSync(path.join(tempDir, path.basename(entrypoint))),
        `${entrypoint} must match the current bootstrap build recipe`,
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
