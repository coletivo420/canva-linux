import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  calculateC420UIBootstrapSourceHash,
  C420UI_BOOTSTRAP_SOURCE_HASH_ALGORITHM,
  C420UI_BOOTSTRAP_SOURCE_HASH_INPUTS,
} from "../scripts/canva-linux/bootstrap/source-hash";

const bootstrapDir = path.join("bootstrap", "c420ui");
const manifestPath = path.join(bootstrapDir, "manifest.json");
const uiEntrypoint = path.join(bootstrapDir, "run-c420ui.cjs");
const cliEntrypoint = path.join(bootstrapDir, "run-c420ui-cli.cjs");

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
  assert.equal(manifest.sourceHash, calculateC420UIBootstrapSourceHash(process.cwd()));
});

test("c420ui bootstrap entrypoints exist and are not empty", () => {
  for (const entrypoint of [uiEntrypoint, cliEntrypoint]) {
    const stats = fs.statSync(entrypoint);
    assert.equal(stats.isFile(), true, `${entrypoint} must be a file`);
    assert.ok(stats.size > 0, `${entrypoint} must not be empty`);
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
