import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

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
    version: string;
    entrypoint: string;
    cliEntrypoint: string;
    moduleFormat: string;
    futureModuleFormat: string;
  }>(manifestPath);
  const packageJson = readJson<{ version: string }>("package.json");

  assert.equal(manifest.kind, "c420ui-bootstrap");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.entrypoint, "run-c420ui.cjs");
  assert.equal(manifest.cliEntrypoint, "run-c420ui-cli.cjs");
  assert.equal(manifest.moduleFormat, "commonjs");
  assert.equal(manifest.futureModuleFormat, "esm");
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
