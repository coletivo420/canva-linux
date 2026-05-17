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
  const bundle = fs.readFileSync("bootstrap/c420ui/run-c420ui.cjs", "utf8");

  assert.doesNotMatch(
    bundle,
    /process\.once\("SIGCONT", function\(\) \{[\s\S]{0,600}?\n\s*};\s*\n\s*process\.kill\(process\.pid, "SIGTSTP"\)/,
  );
});

test("run-c420ui.cjs does not interleave host validators into interactive runner", () => {
  const bundle = fs.readFileSync("bootstrap/c420ui/run-c420ui.cjs", "utf8");

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

test("c420ui bootstrap manifest matches generated build metadata", () => {
  const manifest = readJson<BootstrapManifest>(
    path.join("bootstrap", "c420ui", "manifest.json"),
  );
  const buildMetadata = readJson<BuildMetadata>(
    path.join("config", "canva-linux", "build-metadata.json"),
  );
  const c420uiPackageJson = readJson<{ version?: string }>(
    path.join("packages", "c420ui", "package.json"),
  );

  assert.equal(manifest.dependentProjectBuildRevision, buildMetadata.buildRevision);
  assert.equal(manifest.dependentProjectFullVersion, buildMetadata.fullVersion);
  assert.equal(manifest.dependentProjectDisplayVersion, buildMetadata.displayVersion);
  assert.equal(manifest.dependentProjectPhase, buildMetadata.phase);
  assert.equal(manifest.c420uiVersion, c420uiPackageJson.version);
});
