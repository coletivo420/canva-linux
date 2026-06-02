import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  c420uiBootstrapArtifactPath,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
} from "../checks/bootstrap-check-helpers.js";

const bundles = [
  c420uiBootstrapArtifactPath("run-c420ui.mjs"),
  c420uiBootstrapArtifactPath("run-c420ui-cli.mjs"),
  c420uiBootstrapArtifactPath("c420ui-builder.mjs"),
] as const;

type BootstrapManifest = {
  generatedBy?: string;
  artifactHashes?: Record<string, string>;
  dependentProjectBuildRevision?: string;
  dependentProjectFullVersion?: string;
  dependentProjectDisplayVersion?: string;
  dependentProjectPhase?: string;
  c420uiVersion?: string;
};

type BuildMetadata = {
  buildRevision?: string;
  fullVersion?: string;
  displayVersion?: string;
  phase?: string;
};

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(relativePath, "utf8")) as T;
}

function readBundle(): string {
  return fs.readFileSync(c420uiBootstrapArtifactPath("run-c420ui.mjs"), "utf8");
}

const strictManifestMetadata =
  process.env.CANVA_STRICT_C420UI_ARTIFACT_METADATA === "1";

const C420UI_MANIFEST_METADATA_FIELD_MAPPING = [
  ["dependentProjectBuildRevision", "buildRevision"],
  ["dependentProjectFullVersion", "fullVersion"],
  ["dependentProjectDisplayVersion", "displayVersion"],
  ["dependentProjectPhase", "phase"],
] as const;

for (const bundle of bundles) {
  test(`${bundle} passes node --check`, () => {
    const result = spawnSync(process.execPath, ["--check", bundle], {
      encoding: "utf8",
    });

    assert.equal(
      result.status,
      0,
      `${bundle} failed node --check:\n${result.stderr || result.stdout}`,
    );
  });
}

test("run-c420ui.mjs does not contain known corrupted SIGCONT block", () => {
  const bundle = readBundle();

  assert.doesNotMatch(
    bundle,
    /process\.once\("SIGCONT", function\(\) \{[\s\S]{0,600}?\n\s*};\s*\n\s*process\.kill\(process\.pid, "SIGTSTP"\)/,
  );
});

test("run-c420ui.mjs does not contain corrupted requestLocatorPosition block", () => {
  const bundle = readBundle();
  const start = bundle.indexOf("requestLocatorPosition");
  const end = bundle.indexOf("Program.prototype.decic", start);

  assert.ok(start >= 0);
  assert.ok(end > start);

  const block = bundle.slice(start, end);

  assert.doesNotMatch(block, /return out;/);
  assert.match(block, /\};/);
});

test("run-c420ui.mjs does not interleave file IO into crc32", () => {
  const bundle = readBundle();
  const start = bundle.indexOf("function crc32");
  const end = bundle.indexOf("return crc", start);

  assert.ok(start >= 0);
  assert.ok(end > start);

  const block = bundle.slice(start, end);

  assert.doesNotMatch(block, /fs\d*\.readFileSync/);
  assert.doesNotMatch(block, /path\d*\.resolve/);
});

test("toProgressState is not interleaved with action event handling", () => {
  const bundle = readBundle();
  const start = bundle.indexOf("function toProgressState");
  const end = bundle.indexOf("function createInteractiveActionRunner", start);

  assert.ok(start >= 0);
  assert.ok(end > start);

  const block = bundle.slice(start, end);

  assert.doesNotMatch(block, /event\.type/);
  assert.doesNotMatch(block, /options\.setProgress/);
  assert.doesNotMatch(block, /options\.appendLogText/);
});

test("run-c420ui.mjs does not interleave host validators into interactive runner", () => {
  const bundle = readBundle();

  const runnerStart = bundle.indexOf("function createInteractiveActionRunner");
  const runnerEnd = bundle.indexOf(
    "// build-resources/c420ui/src/host-dependencies.ts",
    runnerStart,
  );

  assert.ok(runnerStart >= 0);
  assert.ok(runnerEnd > runnerStart);

  const runnerBlock = bundle.slice(runnerStart, runnerEnd);

  assert.doesNotMatch(runnerBlock, /function assertOptionalBoolean/);
  assert.doesNotMatch(runnerBlock, /function assertOptionalString/);
  assert.doesNotMatch(runnerBlock, /function assertOptionalStringArray/);
  assert.doesNotMatch(runnerBlock, /function assertOptionalPurposeArray/);
});

test("run-c420ui.mjs does not contain known codePointAt corruption marker", () => {
  const bundle = readBundle();
  assert.doesNotMatch(
    bundle,
    /index < 0 \|\| index >= size[\s\S]{0,200}var size = string\.length;/,
  );
});

test("c420ui bootstrap manifest metadata fields are well-formed", () => {
  const manifest = readJson<BootstrapManifest>(
    C420UI_BOOTSTRAP_MANIFEST_PATH,
  );
  const buildMetadata = readJson<BuildMetadata>(
    path.join("build-resources", "canva-linux", "config", "build-metadata.json"),
  );
  const c420uiPackageJson = readJson<{ version?: string }>(
    path.join("build-resources", "c420ui", "package.json"),
  );

  assert.match(String(manifest.dependentProjectBuildRevision), /^g[0-9a-f]{7}$|^unknown$/);
  assert.equal(typeof manifest.dependentProjectFullVersion, "string");
  assert.equal(typeof manifest.dependentProjectDisplayVersion, "string");
  assert.equal(typeof manifest.dependentProjectPhase, "string");
  assert.notEqual(manifest.dependentProjectFullVersion, "");
  assert.notEqual(manifest.dependentProjectDisplayVersion, "");
  assert.notEqual(manifest.dependentProjectPhase, "");
  assert.equal(manifest.c420uiVersion, c420uiPackageJson.version);
  assert.equal(manifest.generatedBy, "build-resources/c420ui/scripts/build-bootstrap.ts");
  for (const artifact of ["run-c420ui.mjs", "run-c420ui-cli.mjs", "c420ui-builder.mjs"] as const) {
    assert.match(String(manifest.artifactHashes?.[artifact]), /^sha256:[0-9a-f]{64}$/);
  }

  if (strictManifestMetadata) {
    for (const [manifestField, metadataField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
      assert.equal(manifest[manifestField], buildMetadata[metadataField]);
    }
  }
});

test("committed bootstrap manifest does not contain git revision suffixes", () => {
  const manifest = readJson<BootstrapManifest>(C420UI_BOOTSTRAP_MANIFEST_PATH);
  assert.equal(manifest.dependentProjectBuildRevision, "unknown");
  assert.equal(/\+g[0-9a-f]{7}$/i.test(String(manifest.dependentProjectFullVersion || "")), false);
  assert.equal(/\+g[0-9a-f]{7}$/i.test(String(manifest.dependentProjectDisplayVersion || "")), false);
  assert.equal(/\+g[0-9a-f]{7}$/i.test(String(manifest.dependentProjectPhase || "")), false);
});

test("committed bootstrap runtime bundle does not embed effective metadata file path", () => {
  const bundle = readBundle();
  assert.equal(bundle.includes(".build/canva-linux/build-metadata.effective.json"), false);
});
