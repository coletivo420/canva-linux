import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const bundles = [
  "bootstrap/c420ui/run-c420ui.cjs",
  "bootstrap/c420ui/run-c420ui-cli.cjs",
  "bootstrap/c420ui/c420ui-builder.cjs",
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
  return fs.readFileSync("bootstrap/c420ui/run-c420ui.cjs", "utf8");
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

test("run-c420ui.cjs does not contain known corrupted SIGCONT block", () => {
  const bundle = readBundle();

  assert.doesNotMatch(
    bundle,
    /process\.once\("SIGCONT", function\(\) \{[\s\S]{0,600}?\n\s*};\s*\n\s*process\.kill\(process\.pid, "SIGTSTP"\)/,
  );
});

test("run-c420ui.cjs does not contain corrupted requestLocatorPosition block", () => {
  const bundle = readBundle();
  const start = bundle.indexOf("requestLocatorPosition");
  const end = bundle.indexOf("Program.prototype.decic", start);

  assert.ok(start >= 0);
  assert.ok(end > start);

  const block = bundle.slice(start, end);

  assert.doesNotMatch(block, /return out;/);
  assert.match(block, /\};/);
});

test("run-c420ui.cjs does not interleave file IO into crc32", () => {
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

test("run-c420ui.cjs does not interleave host validators into interactive runner", () => {
  const bundle = readBundle();

  const runnerStart = bundle.indexOf("function createInteractiveActionRunner");
  const runnerEnd = bundle.indexOf("var init_interactive_action_runner", runnerStart);

  assert.ok(runnerStart >= 0);
  assert.ok(runnerEnd > runnerStart);

  const runnerBlock = bundle.slice(runnerStart, runnerEnd);

  assert.doesNotMatch(runnerBlock, /function assertOptionalBoolean/);
  assert.doesNotMatch(runnerBlock, /function assertOptionalString/);
  assert.doesNotMatch(runnerBlock, /function assertOptionalStringArray/);
  assert.doesNotMatch(runnerBlock, /function assertOptionalPurposeArray/);
});

test("run-c420ui.cjs codePointAt polyfill exists", () => {
  const bundle = readBundle();
  const start = bundle.indexOf("exports2.codePointAt = function");
  const end = bundle.indexOf("exports2.fromCodePoint", start);

  assert.ok(start >= 0);
  assert.ok(end > start);
});

test("run-c420ui.cjs codePointAt polyfill defines size before use", () => {
  const bundle = readBundle();
  const start = bundle.indexOf("exports2.codePointAt = function");
  const end = bundle.indexOf("exports2.fromCodePoint", start);

  assert.ok(start >= 0);
  assert.ok(end > start);

  const block = bundle.slice(start, end);
  assert.match(block, /var size = string\.length;/);
  assert.ok(
    block.indexOf("var size = string.length;") <
      block.indexOf("index < 0 || index >= size"),
  );
});

test("c420ui bootstrap manifest metadata fields are well-formed", () => {
  const manifest = readJson<BootstrapManifest>(
    path.join("bootstrap", "c420ui", "manifest.json"),
  );
  const buildMetadata = readJson<BuildMetadata>(
    path.join("config", "canva-linux", "build-metadata.json"),
  );
  const c420uiPackageJson = readJson<{ version?: string }>(
    path.join("packages", "c420ui", "package.json"),
  );

  assert.match(String(manifest.dependentProjectBuildRevision), /^g[0-9a-f]{7}$|^unknown$/);
  assert.equal(typeof manifest.dependentProjectFullVersion, "string");
  assert.equal(typeof manifest.dependentProjectDisplayVersion, "string");
  assert.equal(typeof manifest.dependentProjectPhase, "string");
  assert.notEqual(manifest.dependentProjectFullVersion, "");
  assert.notEqual(manifest.dependentProjectDisplayVersion, "");
  assert.notEqual(manifest.dependentProjectPhase, "");
  assert.equal(manifest.c420uiVersion, c420uiPackageJson.version);
  assert.equal(manifest.generatedBy, "scripts/build-c420ui-bootstrap.ts");
  for (const artifact of ["run-c420ui.cjs", "run-c420ui-cli.cjs", "c420ui-builder.cjs"] as const) {
    assert.match(String(manifest.artifactHashes?.[artifact]), /^sha256:[0-9a-f]{64}$/);
  }

  if (strictManifestMetadata) {
    for (const [manifestField, metadataField] of C420UI_MANIFEST_METADATA_FIELD_MAPPING) {
      assert.equal(manifest[manifestField], buildMetadata[metadataField]);
    }
  }
});
