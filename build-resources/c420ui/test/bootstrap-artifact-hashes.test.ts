import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { validateManifestArtifactHashes } from "../checks/check-bootstrap.js";
import {
  C420UI_BOOTSTRAP_ARTIFACT_FILES,
  c420uiBootstrapArtifactPath,
  C420UI_BOOTSTRAP_MANIFEST_PATH,
} from "../checks/bootstrap-check-helpers.js";

const rootDir =
  process.env.CANVA_SCRIPT_REPO_ROOT ||
  process.env.CANVA_TEST_REPO_ROOT ||
  process.cwd();
type BootstrapManifest = {
  generatedBy?: string;
  artifactHashes?: Record<string, string>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function makeTempDir(prefix: string): string {
  const parent = path.join(rootDir, ".build", "test-temp");
  fs.mkdirSync(parent, { recursive: true });
  return fs.mkdtempSync(path.join(parent, prefix));
}

function sha256(filePath: string): string {
  return `sha256:${createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex")}`;
}

function copyBootstrapToTemp(tempDir: string): string {
  const tempRoot = path.join(tempDir, "root");
  const tempBootstrap = path.join(
    tempRoot,
    "build-resources",
    "c420ui",
    "bootstrap",
    "generated",
  );
  fs.mkdirSync(tempBootstrap, { recursive: true });

  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    fs.copyFileSync(
      path.join(rootDir, c420uiBootstrapArtifactPath(artifact)),
      path.join(tempBootstrap, artifact),
    );
  }
  fs.copyFileSync(
    path.join(rootDir, C420UI_BOOTSTRAP_MANIFEST_PATH),
    path.join(tempBootstrap, "manifest.json"),
  );

  return tempRoot;
}

function writeMinimalBootstrapRoot(tempRoot: string): void {
  fs.mkdirSync(path.join(tempRoot, "build-resources", "c420ui"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "build-resources", "canva-linux", "config"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "package.json"), `${JSON.stringify({ version: "1.0.0" })}\n`);
  fs.writeFileSync(
    path.join(tempRoot, "build-resources", "c420ui", "package.json"),
    `${JSON.stringify({ version: "0.1.0" })}\n`,
  );
  fs.writeFileSync(path.join(tempRoot, "build-resources", "c420ui", "source.ts"), "export const value = 1;\n");
  fs.writeFileSync(
    path.join(tempRoot, "build-resources", "canva-linux", "config", "project-ui.json"),
    `${JSON.stringify({ stateDirectoryName: "example-project" })}\n`,
  );
  fs.writeFileSync(
    path.join(tempRoot, "build-resources", "canva-linux", "config", "build-metadata.json"),
    `${JSON.stringify({
      buildRevision: "unknown",
      fullVersion: "1.0.0",
      displayVersion: "1.0.0",
      phase: "Dev",
      dependentProjectSourceHash: "sha256:bbbb",
      combinedSourceHash: "sha256:cccc",
    })}\n`,
  );
}

function compileBootstrapBuilder(tempDir: string): string {
  const outfile = path.join(tempDir, "build-bootstrap.mjs");
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "build-resources/c420ui/scripts/build-bootstrap.ts",
      "--bundle",
      "--platform=node",
      "--target=node22",
      "--format=esm",
      "--external:esbuild",
      `--outfile=${outfile}`,
    ],
    {
      cwd: rootDir,
      encoding: "utf8",
      shell: false,
    },
  );

  assert.equal(
    result.status,
    0,
    `failed to compile bootstrap builder: ${result.stderr || result.stdout}`,
  );
  return outfile;
}

test("manifest artifact hashes match committed bootstrap artifacts", () => {
  const manifest = readJson<BootstrapManifest>(
    C420UI_BOOTSTRAP_MANIFEST_PATH,
  );

  assert.equal(manifest.generatedBy, "c420ui-host bootstrap");
  assert.ok(manifest.artifactHashes);

  for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
    assert.equal(
      manifest.artifactHashes?.[artifact],
      sha256(path.join(rootDir, c420uiBootstrapArtifactPath(artifact))),
    );
  }
});

test("manifest hash validation fails when an artifact is manually edited", () => {
  const tempDir = makeTempDir("c420ui-artifact-hash-");

  try {
    const tempRoot = copyBootstrapToTemp(tempDir);
    fs.appendFileSync(
      path.join(tempRoot, "build-resources", "c420ui", "bootstrap", "generated", "run-c420ui.mjs"),
      "\n// manual edit\n",
    );

    const manifest = readJson<Record<string, unknown>>(
      path.join(tempRoot, "build-resources", "c420ui", "bootstrap", "generated", "manifest.json"),
    );
    const failures: string[] = [];
    validateManifestArtifactHashes(tempRoot, manifest, failures);

    assert.equal(failures.length, 1);
    assert.match(failures[0], /run-c420ui\.mjs: artifact hash differs/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("build:c420ui-bootstrap cleans output directory before writing", () => {
  const tempDir = makeTempDir("c420ui-clean-build-");

  try {
    const tempRoot = path.join(tempDir, "root");
    writeMinimalBootstrapRoot(tempRoot);
    const outDir = path.join(
      tempRoot,
      "build-resources",
      "c420ui",
      "bootstrap",
      "generated",
    );
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "stale-file.txt"), "stale\n");

    const builder = compileBootstrapBuilder(tempDir);
    const result = spawnSync(process.execPath, [builder], {
      cwd: rootDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CANVA_SCRIPT_REPO_ROOT: tempRoot,
        C420UI_HOST_BIN:
          process.env.C420UI_HOST_BIN ??
          path.join(rootDir, "build-resources", "c420ui-rs", "target", "debug", "c420ui-host"),
      },
      shell: false,
    });

    assert.equal(
      result.status,
      0,
      `bootstrap builder failed: ${result.stderr || result.stdout}`,
    );
    assert.equal(fs.existsSync(path.join(outDir, "stale-file.txt")), false);

    const manifest = readJson<BootstrapManifest>(path.join(outDir, "manifest.json"));
    assert.equal(manifest.generatedBy, "c420ui-host bootstrap");
    for (const artifact of C420UI_BOOTSTRAP_ARTIFACT_FILES) {
      assert.equal(manifest.artifactHashes?.[artifact], sha256(path.join(outDir, artifact)));
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
